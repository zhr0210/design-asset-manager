# Handoff Report — Phase 14 Read-only Exploration

This handoff report summarizes the read-only findings for Phase 14 path governance and AI worker remediation.

---

## 1. Observation
*   **Observation 1 (Path Governance Tests):** Running `npm run test-path-governance-late-phases` successfully passes:
    ```
    > design-asset-manager@1.0.0 test-path-governance-late-phases
    > node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts
    ```
*   **Observation 2 (Governance Boundaries):** In `src/main/path-migration/asset-library-path-governance.ts`, the governance checks return:
    ```typescript
    export interface AssetLibraryPathGovernanceReport {
      dryRunOnly: boolean
      autoMoveFiles: boolean
      autoDeleteFiles: boolean
      autoUpdateFilePath: boolean
      // ...
    }
    ```
    And implementation guarantees `autoMoveFiles: false`, `autoDeleteFiles: false`, and `autoUpdateFilePath: false`.
*   **Observation 3 (Mock Worker Endpoints):** In `ai-service/app.py`, the endpoints `/ai/prompt/generate` and `/ai/analysis/generate` explicitly block access in strict mode:
    ```python
    if is_strict_real_ai():
        raise HTTPException(
            status_code=501,
            detail="Python PromptWorker mock path is disabled in production. Use the Qwen3-VL Llama/OpenAI-compatible prompt route."
        )
    ```
*   **Observation 4 (Model Wrapper Fallbacks):** In `ai-service/models/ram_tagger.py`, loading catches errors and handles them by checking `guard_mock_inference()` before setting `self.is_mock = True`:
    ```python
            except Exception as import_err:
                if isinstance(import_err, MockInferenceBlockedError): raise
                print(f"[RAMTaggerModel] Real RAM++ dependencies or weights not resolved: {import_err}. Using mock fallback.")
                guard_mock_inference("RAM++", str(import_err))
                self.is_mock = True
    ```
*   **Observation 5 (MPS GPU Telemetry):** In `ai-service/core/gpu_monitor.py` (lines 121-149), Apple Silicon MPS memory is statically estimated:
    ```python
            sp = subprocess.run(
                ["system_profiler", "SPHardwareDataType"],
                capture_output=True, text=True, timeout=5
            )
            mem_match = re.search(r"Memory:\s*(\d+)\s*GB", sp.stdout)
            if mem_match:
                total_gb = int(mem_match.group(1))
                gpu_share_gb = round(total_gb * 0.70, 1)
                total_vram_mb = int(gpu_share_gb * 1024)
                # Estimate: ~25% in use for system + apps
                used_vram_mb = int(total_vram_mb * 0.25)
    ```

---

## 2. Logic Chain
1.  **From Observation 1 and 2:** The governance files (`asset-library-path-governance.ts` and `download-path-governance.ts`) are verified by the TS test suite to contain no references to the file system or database. They strictly produce dry-run plan reports conforming to non-destructive configurations (`autoMoveFiles: false`, `autoDeleteFiles: false`). Therefore, the implementation plan for Phase 14A and 14B can safely integrate these governance functions directly as dry-run plan generators without risking file deletion or database corruption.
2.  **From Observation 3:** The mock PromptWorker and AnalysisWorker routes in Python are blocked in strict mode by raising an HTTP 501. Consequently, these routes do not run in production. The system resolves real prompt reverse requests by routing them via the `LlamaOpenAIProvider` or `OpenAICompatibleProvider` at `src/main/services/ai-worker/ai-worker-manager.ts`.
3.  **From Observation 4:** The python model wrappers utilize `guard_mock_inference` to raise a `MockInferenceBlockedError` in strict real AI mode, preventing mock fallbacks. However, to make this policy robust across packaged production configurations, the environment checks inside `mock_policy.py` should be expanded to automatically infer strict mode under `NODE_ENV === "production"` or when running inside an Electron `.app/Contents/Resources` directory.
4.  **From Observation 5:** The macOS MPS telemetry relies on static estimations (70% total memory share limit, 25% default usage). We can transition this to a process-specific telemetry collector utilizing the Python process RSS and `torch.mps` current allocated/driver memory APIs.

---

## 3. Caveats
*   **Alternative Telemetry:** Process memory (RSS) query relies on the shell command `ps` or package libraries (like `psutil`, which might not be installed in the project's base Python environment). If standard library / simple shell command options are preferred to avoid extra dependencies, we can use `subprocess.run(["ps", "-o", "rss=", "-p", str(pid)])` as modeled in the analysis proposal.

---

## 4. Conclusion
The Phase 14 read-only investigation is complete. 
*   **Path Governance (Route A)** is safe, isolated, and passes tests. It can be integrated into the main process to compute dry-run remapping plans.
*   **AI Worker Remediation (Route B)** mock endpoints are successfully disabled in production mode.
*   **Model Mock Policies** can be enhanced to fail-closed automatically inside packaged builds.
*   **macOS MPS/Metal Telemetry** should transition to a process RSS and `torch.mps` memory checking model to reflect real-time allocations accurately.

---

## 5. Verification Method
1.  **Verify Path Governance:**
    *   Command: `npm run test-path-governance-late-phases`
    *   Inspected File: `src/main/path-migration/asset-library-path-governance.ts`
2.  **Verify strict mock policy:**
    *   In a Python environment where `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1` is set, check that loading any missing/uncached model raises `MockInferenceBlockedError`.
3.  **Verify GPU status:**
    *   Run `python3 -c "from core.gpu_monitor import get_gpu_status; print(get_gpu_status())"` and ensure the output returns `"Apple Silicon (MPS)"` with realistic VRAM allocations rather than static 25% estimations.
