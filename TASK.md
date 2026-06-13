# Current Task

## Goal

Stabilize the completed Windows/macOS shared-architecture work before declaring
the long-running roadmap complete.

The product rule remains: default to shared main-process workflows, renderer
contracts, product status vocabulary, and UI surfaces. Branch only for real OS
capabilities, inference runtimes, packaging/native dependencies, paths, or
process behavior.

## Current Scope

1. Keep CUDA numerical optimizations capability-driven and evidence-backed.
2. Keep the default Python dependency install CPU-safe on every platform.
3. Use an explicit NVIDIA Windows CUDA dependency profile only on a compatible
   host.
4. Close Windows OCR real-model evidence or leave it accurately classified as
   `runtime_probe_ready`.
5. Preserve all existing IPC channel names, database schema semantics, AI Worker
   HTTP APIs, and Platform AI Branch Status response fields.

## Mac-Side Stabilization

- `torch.inference_mode()` remains enabled for pure inference blocks.
- TF32 is opt-in through `DAM_CUDA_TF32=1`; exact float32 remains the default
  until model-level quality comparisons justify a broader default.
- cuDNN variable-shape autotuning remains opt-in through
  `DAM_CUDNN_BENCHMARK=1`.
- `ai-service/requirements.txt` is the CPU-safe default.
- `ai-service/requirements-windows-cuda.txt` is the explicit NVIDIA Windows
  profile.
- Minimal `.codeindex` context files are restored so agent-context governance
  can run again.

## Windows Validation Required

The Windows host must fast-forward from GitHub before validation.

Required evidence:

- Default requirements resolve to CPU ONNX packages.
- Windows CUDA profile resolves to GPU ONNX packages on the NVIDIA host.
- Existing CUDA fixed-tensor execution still succeeds.
- TF32 exact/default and opt-in modes both execute; model-level output
  comparisons must be reported before recommending TF32 as a default.
- WD Tagger and CLIP ONNX real evidence remain valid.
- OCR remains `runtime_probe_ready` unless a real OCR model session and minimal
  image inference succeed.
- Llama GGUF/mmproj text plus generated-image evidence remains valid.
- Electron/Playwright AI Console has no document/body horizontal overflow.

Update `docs/platform/WINDOWS_AI_REAL_EVIDENCE_RESULT.md` with a sanitized
summary. Do not include secrets, full private paths, model-cache paths, private
asset data, or binary payloads.

## Validation

Mac checks:

```bash
python3 -m unittest discover ai-service/tests
npm run typecheck
npm run build
npm run ci:test-runtime-safety
python3 scripts/check-agent-context.py
python3 scripts/check-docs-sync.py
git diff --check
```

`check-forbidden-paths.py` may report pre-existing untracked `docs/agents/`
content. Do not delete or stage unrelated user files to make that check pass.

## Current Result

Mac and Windows stabilization validation now pass on commit `13610a4`.

- Windows typecheck, production build, runtime-safety contracts, and 129 Python
  tests passed.
- The default requirements dry-run selected CPU ONNX only. The explicit
  Windows CUDA profile selected GPU ONNX only.
- Real CUDA execution confirmed exact float32 is the default and
  `DAM_CUDA_TF32=1` is required to enable TF32.
- WD Tagger ONNX, CLIP ONNX embedding, and Llama GGUF/mmproj text plus
  generated-image evidence remain valid.
- OCR remains accurately classified as `runtime_probe_ready`; no real OCR
  model load plus minimal generated-image inference was available.
- Electron/Playwright clicked AI Console refresh without `page.reload()`.
  Screenshot review and DOM checks found no horizontal clipping, overlap, or
  document/body overflow at `1266x795`.
- No user asset was read, no new model weight was downloaded, and generated
  logs/screenshots remain outside the repository.

Remaining evidence work is optional and bounded: obtain real OCR model
load/inference evidence before promotion, and perform model-level quality
comparisons before reconsidering TF32 as a default.

## Completion Rule

The stabilization acceptance criteria are complete:

- Mac validation passes.
- Windows validation passes on the same commit.
- TF32 policy has either model-quality evidence or remains opt-in.
- Windows dependency selection is capability/profile-driven rather than
  selected only by OS.
- OCR status is backed by real evidence or remains explicitly incomplete.
- No required public contract changed unintentionally.
