# Handoff Report - Model Download Optimizer & Parallel Transfer

This handoff report summarizes the read-only investigation and proposal to optimize the model downloading logic across `download_hf_model.py` and `download_cooperative_hf_model.py`.

---

## 1. Observation
We inspected the following files and directories in the workspace:
1. `ai-service/tools/download_hf_model.py`:
   - Uses `snapshot_download` from the `huggingface_hub` package (lines 32, 43–52).
   - Enforces TLS 1.2 by patching `urllib3.PoolManager` (lines 7–11).
   - Hardcodes `resume_download=True` (line 46) but ignores GGUF models (`*.gguf` in `ignore_patterns` on line 51).
2. `ai-service/tools/download_cooperative_hf_model.py`:
   - Hardcodes `HF_RESOLVE = "https://huggingface.co/{repo_id}/resolve/main/{filename}"` (line 12).
   - Downloads files via sequential calls to `urllib.request.urlopen` (line 105).
   - Loads the entire file into memory using `data = resp.read()` and writes it at once using `dest.write_bytes(data)` (lines 109, 120), leading to OOM risk on large files (e.g. Florence-2 weights, ~1.5 GB).
   - For `gguf` files, it performs no actual transfer and returns mock success immediately (lines 200–205).
3. `src/main/services/llama-runtime/llama-runtime-install.service.ts`:
   - Handles LLM GGUF & mmproj downloads using custom Node.js `fetch` streaming (lines 226–248, 621–680) and supports fallback URL switching between primary (mirror) and fallback (official) URLs (lines 571–582).

---

## 2. Logic Chain
1. **Mirror Switching**:
   - Setting mirror site support requires altering the base download URL.
   - For `download_hf_model.py`, `huggingface_hub` respects the `HF_ENDPOINT` environment variable. Therefore, passing a `--mirror` argument to the script and mapping it to `os.environ["HF_ENDPOINT"]` before importing/running `snapshot_download` will enable mirror support.
   - For `download_cooperative_hf_model.py`, replacing the hardcoded `HF_RESOLVE` base URL `https://huggingface.co` with the mirror domain (e.g., `https://hf-mirror.com` via `--mirror` arg or `HF_ENDPOINT` env var) will force it to resolve files through the mirror site.
2. **Resume-on-Failure**:
   - Currently, `download_cooperative_hf_model.py` reads everything to RAM and writes in one shot, which throws away any partial progress when connection cuts out.
   - By creating a `.part` file, inspecting its size before initiating request, adding the HTTP header `Range: bytes={downloaded_bytes}-`, writing incoming chunks to the file descriptor in append mode (`'ab'`), and renaming the `.part` file to the final destination upon completion, we can achieve robust resume support and prevent OOM issues.
3. **Multi-Channel Parallel Transfer**:
   - By obtaining the file size with a `HEAD` request and dividing the file into $N$ equal chunks, we can spin up a thread pool (`concurrent.futures.ThreadPoolExecutor`) to download each segment (`bytes=start-end`) to its own partition file (`{filename}.part.i`).
   - If a segment fails, we can resume just that segment.
   - Once all segments are finished, we merge them in correct index order.
   - This provides speed benefits while remaining fully backward compatible with the existing single-channel fallback flow if the server does not support Range requests.

---

## 3. Caveats
- **HF Hub Range Support**: Not all Hugging Face mirrors or endpoints guarantee support for range requests (HTTP status 206). A fallback check is required: if a server rejects range headers or does not return 206, the downloader must fall back to sequential single-connection streaming to avoid errors.
- **Node-based Installer vs. Python Downloader**: The GGUF models used by `llama-server` are currently downloaded directly inside the Electron main process via `LlamaRuntimeInstallService`. However, the Python downloader `download_cooperative_hf_model.py` also exposes a `gguf` option that remains unimplemented. If GGUF downloading is shifted to the Python tool, it should utilize the same parallelized range request design.
- **Token Authorization**: Private or gated Hugging Face repositories require an API token. The parallel downloader must copy the `Authorization: Bearer <token>` header to all range requests.

---

## 4. Conclusion
We propose enhancing the Python download scripts with the following changes:
- In `download_hf_model.py`: Parse `--mirror` and configure `os.environ["HF_ENDPOINT"]` before running `snapshot_download`.
- In `download_cooperative_hf_model.py`: Rewrite URL resolver to support mirrors; replace raw `read()` calls with chunk-based streaming to a temporary `.part` file using HTTP `Range` headers; and introduce a ThreadPoolExecutor-based segment range downloader for files larger than 15MB.

Detailed designs and code patches are outlined in `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_phase16_3/analysis.md`.

---

## 5. Verification Method
- **Type Checking & Building**:
  Run from the project root:
  ```bash
  npm run typecheck
  npm run build
  ```
- **Python Unit Tests**:
  Verify AI service tests pass:
  ```bash
  python -m unittest discover ai-service/tests
  ```
- **CLI Validation of Script Args**:
  Once implemented, execution of the python scripts can be verified manually (dry-run style) using dummy or small models:
  ```bash
  python3 ai-service/tools/download_cooperative_hf_model.py --model-family wd_tagger --local-dir ~/Downloads/wd_tagger_test --mirror https://hf-mirror.com
  ```
