"""DAM owned, offline Qwen3-VL CPU process. Named requests on private stdio only."""
import base64
import contextlib
import io
import json
import os
from pathlib import Path
import socket
import sys
import time
import threading

output_lock = threading.Lock()
# Keep the protocol independent of the Windows console encoding and library stdout redirects.
protocol_output = sys.stdout.buffer

os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", HF_DATASETS_OFFLINE="1",
                  PYTHONDONTWRITEBYTECODE="1", OMP_NUM_THREADS="8")
sys.dont_write_bytecode = True

def deny_network(*args, **kwargs):
    raise RuntimeError("LOCAL_RUNTIME_NETWORK_DENIED")

socket.socket.connect = deny_network
socket.socket.connect_ex = deny_network
socket.create_connection = deny_network

def emit(value):
    with output_lock:
        protocol_output.write((json.dumps(value, ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8"))
        protocol_output.flush()

def main():
    # Only the installed Transformers implementation runs. Model repository Python is never imported.
    with contextlib.redirect_stdout(sys.stderr):
        import torch
        import psutil
        import transformers
        from PIL import Image
        from transformers import AutoProcessor, Qwen3VLForConditionalGeneration, StoppingCriteria, StoppingCriteriaList
        root = Path(sys.argv[1]).resolve(strict=True)
        config = json.loads((root / "config.json").read_text(encoding="utf-8"))
        profile = (config.get("text_config", {}).get("hidden_size"), config.get("text_config", {}).get("num_hidden_layers"))
        if config.get("model_type") != "qwen3_vl" or profile not in ((2048, 28), (2560, 36)) or config.get("auto_map") or config.get("quantization_config"):
            raise ValueError("LOCAL_MODEL_UNSUPPORTED")
        threads = int(sys.argv[2])
        if threads not in (2, 4, 8):
            raise ValueError("LOCAL_CONFIG_INVALID")
        torch.set_num_threads(threads)
        started = time.monotonic()
        processor = AutoProcessor.from_pretrained(str(root), local_files_only=True, trust_remote_code=False,
                                                  min_pixels=28*28*4, max_pixels=28*28*256)
        model = Qwen3VLForConditionalGeneration.from_pretrained(str(root), local_files_only=True,
                    trust_remote_code=False, dtype=torch.float32, device_map={"": "cpu"}, attn_implementation="sdpa").eval()
        process = psutil.Process()

    def metrics():
        m = process.memory_info()
        return {"rssBytes": m.rss, "peakRamBytes": getattr(m, "peak_wset", m.rss),
                "device": "cpu", "dtype": "float32", "threads": threads}

    emit({"kind": "loaded", "metrics": metrics(), "torch": torch.__version__,
          "transformers": transformers.__version__, "parameters": sum(p.numel() for p in model.parameters()),
          "loadMs": round((time.monotonic()-started)*1000)})

    def heartbeat():
        while True:
            time.sleep(1)
            emit({"kind": "metrics", "metrics": metrics()})
    threading.Thread(target=heartbeat, daemon=True).start()

    class Deadline(StoppingCriteria):
        def __init__(self, seconds): self.end = time.monotonic() + seconds
        def __call__(self, *args, **kwargs): return time.monotonic() >= self.end

    for line in sys.stdin.buffer:
        if len(line) > 6*1024*1024:
            raise ValueError("LOCAL_INPUT_TOO_LARGE")
        request = json.loads(line)
        if request.get("kind") == "stop":
            return
        request_id = request.get("id")
        try:
            if request.get("kind") != "infer" or not isinstance(request_id, str):
                raise ValueError("LOCAL_INPUT_INVALID")
            requested_threads = request.get("threads", threads)
            if requested_threads not in (2, 4, 8):
                raise ValueError("LOCAL_CONFIG_INVALID")
            if requested_threads != threads:
                torch.set_num_threads(requested_threads)
                threads = requested_threads
            tokens = request["maxTokens"]
            if not isinstance(tokens, int) or not 1 <= tokens <= 3072:
                raise ValueError("LOCAL_INPUT_INVALID")
            url = request["imageDataUrl"]
            if not url.startswith("data:image/jpeg;base64,"):
                raise ValueError("LOCAL_INPUT_INVALID")
            raw = base64.b64decode(url.split(",", 1)[1], validate=True)
            if not 1 <= len(raw) <= 4*1024*1024:
                raise ValueError("LOCAL_INPUT_TOO_LARGE")
            image = Image.open(io.BytesIO(raw))
            if image.width > 1024 or image.height > 1024 or image.width*image.height > 1024**2:
                raise ValueError("LOCAL_INPUT_INVALID")
            if len(request["systemPrompt"]) + len(request["userPrompt"]) > 16000:
                raise ValueError("LOCAL_INPUT_TOO_LARGE")
            messages = [{"role": "system", "content": request["systemPrompt"]},
                        {"role": "user", "content": [{"type": "image"}, {"type": "text", "text": request["userPrompt"]}]}]
            started = time.monotonic()
            with contextlib.redirect_stdout(sys.stderr):
                text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
                batch = processor(text=[text], images=[image.convert("RGB")], return_tensors="pt", padding=True)
                if batch.input_ids.shape[1] > 4096:
                    raise ValueError("LOCAL_CONTEXT_LIMIT")
                with torch.inference_mode():
                    # Greedy decoding can loop on repeated JSON array items for
                    # real previews. Keep a bounded deterministic repetition
                    # penalty; Host still rejects truncated or invalid output.
                    generated = model.generate(**batch, max_new_tokens=tokens, do_sample=False, repetition_penalty=1.1,
                                               stopping_criteria=StoppingCriteriaList([Deadline(110)]))
                tail = generated[0, batch.input_ids.shape[1]:]
                output = processor.decode(tail, skip_special_tokens=True, clean_up_tokenization_spaces=False)
                eos = model.generation_config.eos_token_id
                eos = [eos] if isinstance(eos, int) else eos
                usage = {"prompt_tokens": int(batch.input_ids.shape[1]), "completion_tokens": int(tail.shape[0])}
                reason = "stop" if tail[-1].item() in eos else "length"
                del batch, generated, tail
            emit({"kind": "result", "id": request_id, "metrics": metrics(),
                  "elapsedMs": round((time.monotonic()-started)*1000),
                  "value": {"choices": [{"message": {"content": output}, "finish_reason": reason}], "usage": usage}})
        except Exception as error:
            code = str(error) if isinstance(error, ValueError) and str(error).startswith("LOCAL_") else "LOCAL_INFERENCE_FAILED"
            emit({"kind": "error", "id": request_id, "code": code, "metrics": metrics()})

if __name__ == "__main__":
    try:
        main()
    except Exception:
        emit({"kind": "fatal", "code": "LOCAL_RUNTIME_START_FAILED"})
        sys.exit(1)
