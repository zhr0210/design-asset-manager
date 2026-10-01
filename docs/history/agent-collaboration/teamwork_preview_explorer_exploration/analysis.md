# Detailed Investigation Report — Phase 14 Architecture and AI Worker Remediation

## Executive Summary
This report presents the read-only architectural investigation and design recommendations for:
1. **Asset Library and Download Path Governance** (Phase 14A & Phase 14B).
2. **AI Worker Mock Remediation and GPU/MPS Telemetry Transition** (Route B).
3. **Automated Verification Status and Methods**.

Our investigation confirms that the TypeScript governance modules are cleanly structured as pure, non-destructive functions, and the Python mock fallbacks are guarded using a strict policy check. We have designed concrete improvements for macOS process-level MPS telemetry and enhanced mock detection.

---

## 1. Route A: Asset Library and Download Path Governance

### 1.1 Path Governance Files
*   **Asset Library Governance:** `src/main/path-migration/asset-library-path-governance.ts`
*   **Download Governance:** `src/main/path-migration/download-path-governance.ts`
*   **Media Path Governance:** `src/main/path-migration/media-path-governance.ts`

### 1.2 Governance Architecture and Compliance
The governance files are implemented as **pure functions** that do not interact with the disk or the database. 
*   **Database Isolation:** A static check in `scripts/path-governance-late-phases.test.ts` enforces that these files must not contain references to `better-sqlite3` or any SQL operations (`SELECT`, `UPDATE`, `INSERT`, `DELETE`).
*   **File System Isolation:** The same test ensures these files do not use `fs.`, `existsSync`, `readFile`, `writeFile`, `rename`, or `unlink`.
*   **Hardcoded Boundaries:** Both functions return metadata declaring `dryRunOnly: true` and:
    *   `autoMoveFiles: false`
    *   `autoDeleteFiles: false`
    *   `autoUpdateFilePath: false` (Phase 14A)
    *   `autoModifyDownloadQueue: false` (Phase 14B)

### 1.3 Implementation Strategy for Dry-Run Reports
To safely perform path governance analysis:
1.  **Asset Library (Phase 14A):**
    *   The Electron main process queries target records from the SQLite database (e.g. `assets` table) to retrieve the current file paths and thumbnails.
    *   It structures this query data into `AssetLibraryPathSample[]` array.
    *   It passes the array to `createAssetLibraryPathGovernanceReport()`.
    *   Since `existenceCheckDeferred: true` is set, it does not touch the actual files. It provides shape-only analysis suggesting either `review-library-root` (if path is populated) or `skip-empty-path` (if path is empty), leaving actual file moving/remapping to later user-confirmed steps.
2.  **Download Save Path Policy (Phase 14B):**
    *   Upon initiating a download, the main process lists filenames in the destination download directory (`downloadsRoot`).
    *   It passes the destination folder, requested filename, and existing directory listings to `createDownloadPathDryRunPlan()`.
    *   The function sanitizes illegal Windows characters (`/[<>:"/\\|?*\u0000-\u001F]/g`) to `_`, trims whitespace, and resolves name collisions by appending a hyphenated counter (e.g. `name-2.ext`).
    *   Because `autoModifyDownloadQueue: false` is returned, the output remains a visual plan/preview that the UI displays before execution.

---

## 2. Route B: AI Worker Mock and Planned Capability Remediation

### 2.1 PromptWorker and AnalysisWorker Endpoints
*   **Files:** `ai-service/workers/prompt_worker.py` and `ai-service/workers/analysis_worker.py`
*   **FastAPI Endpoints:** `/ai/prompt/generate` and `/ai/analysis/generate` in `ai-service/app.py`.
*   **Current Protection:** Both endpoints query `is_strict_real_ai()` and raise HTTP 501 immediately if strict real AI mode is enabled:
    ```python
    if is_strict_real_ai():
        raise HTTPException(
            status_code=501,
            detail="Python PromptWorker mock path is disabled in production. Use the Qwen3-VL Llama/OpenAI-compatible prompt route."
        )
    ```
*   **Remediation Recommendation:** To completely hide or replace these legacy mock routes in production:
    1.  Remove these mock endpoints from the primary FastAPI route definition or return HTTP 404/501 unconditionally.
    2.  Ensure that `AiWorkerManager` in the Electron main process always routes prompt reverse requests via the `llama-openai` (using the local `llama-server`) or `openai-compatible` providers, which query real model endpoints.

### 2.2 Model Wrapper Mock Fallbacks
*   **Location:** `ai-service/models/` (e.g., `ram_tagger.py`, `florence2_tagger.py`, `wd_tagger.py`, `clip_design_classifier.py`, `qwen_vl_fallback_analyzer.py`).
*   **Fallback Logic:**
    1.  During `load()`, if real dependencies (e.g. `torch`, `transformers`) are missing or weight loading fails, the wrapper catches the exception and transitions to `self.is_mock = True`.
    2.  Before setting `is_mock = True` or running simulated predictions, it calls `guard_mock_inference("ModelName", "Reason/Error description")`.
    3.  `guard_mock_inference()` checks if mock inference is allowed. If `DESIGN_ASSET_MANAGER_STRICT_REAL_AI` is `"1"`, it throws `MockInferenceBlockedError`, aborting the fallback and failing closed.
*   **Improvement Proposal (Packaged/Production Auto-Fail-Closed):**
    We can improve `is_strict_real_ai()` in `ai-service/core/mock_policy.py` to auto-detect packaged or production modes even if the environment variable was omitted:
    ```python
    def is_strict_real_ai() -> bool:
        # Check explicit strict mode environment variable
        if os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI") == "1":
            return True
        
        # Check standard production environment indicators
        if os.environ.get("NODE_ENV") == "production" or os.environ.get("PRODUCTION") == "1":
            return True
            
        # Detect execution from a packaged Electron macOS Application bundle
        current_path = os.path.abspath(__file__)
        if "Contents/Resources" in current_path or "app.asar" in current_path:
            return True
            
        return False
    ```

### 2.3 Transitioning macOS MPS/Metal Telemetry to Process-Level Querying
*   **Files:** `ai-service/core/gpu_monitor.py` & `ai-service/tools/gpu_memory_probe.py`
*   **Current Design:** Apple Silicon MPS memory is estimated statically by reading the total hardware RAM from `system_profiler SPHardwareDataType`, reserving 70% as the GPU share, and assuming 25% of that is used.
*   **Transition Design:**
    To obtain real-time, process-level MPS/Metal memory allocations, we can query PyTorch's native MPS memory APIs and check the Python process Resident Set Size (RSS):
    
    #### Proposed Code Patch snippet for `gpu_monitor.py`:
    ```python
    # 3. Try Apple Silicon MPS (macOS unified memory)
    import platform
    if platform.system() == "Darwin":
        try:
            # Resolve system total memory quickly via sysctl
            total_bytes = int(subprocess.check_output(["sysctl", "-n", "hw.memsize"]).strip())
            total_vram_mb = int((total_bytes * 0.70) / (1024 * 1024))  # GPU share allocation limit
            
            # Fetch process memory footprint
            import os
            pid = os.getpid()
            rss_bytes = 0
            try:
                # Use ps command to get RSS (Resident Set Size) in KB
                rss_kb = int(subprocess.check_output(["ps", "-o", "rss=", "-p", str(pid)]).strip())
                rss_bytes = rss_kb * 1024
            except Exception:
                pass
                
            mps_allocated_bytes = 0
            mps_driver_bytes = 0
            if TORCH_AVAILABLE and torch.backends.mps.is_available():
                if hasattr(torch, "mps"):
                    if hasattr(torch.mps, "current_allocated_memory"):
                        mps_allocated_bytes = torch.mps.current_allocated_memory()
                    if hasattr(torch.mps, "driver_allocated_memory"):
                        mps_driver_bytes = torch.mps.driver_allocated_memory()
            
            # Real used memory is either driver allocation or overall process RSS (whichever is larger)
            used_vram_bytes = max(mps_driver_bytes, rss_bytes)
            used_vram_mb = int(used_vram_bytes / (1024 * 1024))
            
            # System-wide memory usage using vm_stat as fallback to calculate actual free memory
            free_vram_mb = total_vram_mb - used_vram_mb
            try:
                vm = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=2)
                pagesize = 4096
                for line in vm.stdout.split('\n'):
                    if "page size of" in line:
                        pagesize = int(re.search(r'page size of (\d+) bytes', line).group(1))
                        break
                stats = {}
                for line in vm.stdout.split('\n'):
                    parts = line.split(':')
                    if len(parts) == 2:
                        stats[parts[0].strip()] = int(parts[1].strip().strip('.'))
                
                free_pages = stats.get("Pages free", 0) + stats.get("Pages speculative", 0)
                system_free_bytes = free_pages * pagesize
                system_free_mb = int(system_free_bytes / (1024 * 1024))
                # Adjust free capacity based on physical limits
                free_vram_mb = min(free_vram_mb, system_free_mb)
            except Exception:
                pass
            
            utilization_percent = int((used_vram_mb / total_vram_mb) * 100) if total_vram_mb > 0 else 0
            
            return {
                "available": True,
                "is_mock": False,
                "device_name": "Apple Silicon (MPS)",
                "total_vram_mb": total_vram_mb,
                "used_vram_mb": used_vram_mb,
                "free_vram_mb": max(0, free_vram_mb),
                "utilization_percent": min(100, utilization_percent),
                "processes": [{"pid": pid, "name": "python-worker", "used_memory": f"{used_vram_mb} MB"}]
            }
        except Exception as e:
            pass
    ```
    This change eliminates static estimation and calculates process-level Metal utilization dynamically.

---

## 3. Route C: Verification

### 3.1 Test Locations
*   **TypeScript Path Governance Late Phases Test:** `scripts/path-governance-late-phases.test.ts`
*   **Python Worker stability unit test:** `ai-service/tests/test_ai_worker.py`
*   **Other Python tests:** `ai-service/tests/` directory.

### 3.2 Running the Tests
1.  **TypeScript Path Governance late phase test:**
    *   Command: `npm run test-path-governance-late-phases` (runs `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts`).
    *   **Status: PASS.** Verified successfully on Mac.
2.  **Python test suite:**
    *   Command: `python3 -m unittest discover -s ai-service/tests`
    *   **Verification Strategy:** In `test_ai_worker.py`, the test suite monkeypatches `QwenVLFallbackAnalyzer.load` to mock mode, testing the model eviction and queue lock logic. To execute the tests, the python test harness initializes the worker components.
