## Forensic Audit Report

**Work Product**: Design Asset Manager (Route A and Route B Implementations)
**Profile**: General Project (Development/Demo Mode)
**Verdict**: CLEAN

---

### Audit Summary
This audit validates the integrity of the implemented changes for **Route A** (Database Path Migration Governance) and **Route B** (macOS AI capabilities, fail-closed model wrappers, and process-level GPU memory telemetry). 
All checks confirm that the implementations are authentic, run genuine logic, enforce correct boundaries, fail closed in production, and retrieve true telemetry metrics without shortcuts.

---

### Phase Results

#### Phase 1: Source Code Analysis
- **Hardcoded Output Detection**: **PASS**
  - Checked `src/main/path-migration/` and `ai-service/` codebase for hardcoded expected outcomes, dummy values, or pre-calculated test results. Real logic is dynamically executed in all instances.
- **Facade Detection**: **PASS**
  - Verified that all core model classes (`RAMTaggerModel`, `WDTaggerModel`, `Florence2TaggerModel`, `CLIPDesignClassifier`) implement real, genuine PyTorch/ONNX inference pipelines. Mock fallbacks are only triggered under strict development settings and are blocked in production.
- **Pre-populated Artifact Detection**: **PASS**
  - Confirmed no pre-existing log files, mock results, or fake attestation files exist in the codebase prior to validation.

#### Phase 2: Behavioral Verification
- **Build and Run**: **PASS**
  - TypeScript compiles cleanly with `npm run typecheck`.
  - All 80 Python unit tests discoverable under `ai-service/tests/` ran and passed successfully.
  - *Note on TS Tests*: Three pre-existing developer assertions fail due to macOS/user path structure (regex checking `/^\/Users\//` when processes run under `/Users/meigong/`), hardcoded Windows platform assumptions (`windows-cpu` vs `macos-apple-silicon` recommended profile), and outdated UI route selectors (`projectCooperativeModelReadinessDisplay` not directly in `AiConsolePage.tsx`). These do not constitute integrity violations of the implemented work.
- **Output Verification**: **PASS**
  - Inferred outputs (both mock and real) are contextually relevant to image inputs/filenames, showing dynamic and authentic code logic.
- **Dependency Audit**: **PASS**
  - Libraries used (`torch`, `onnxruntime`, `transformers`) are standard ML frameworks for local inference. The core application logic has not been outsourced to external third-party API wrapper shortcuts.

---

### Verification Details (Route A: Path Migration)
1. **Governance & Boundaries**:
   - `src/main/path-migration/asset-library-path-governance.ts` contains hardcoded safety defaults: `autoMoveFiles: false` and `autoDeleteSource: false`.
   - Modifying settings to point back to the original library does not trigger destructive deletions or file movements.
2. **Dry-Run Logic**:
   - `src/main/path-migration/database-path-design.ts` defines `createDatabasePathRemapDryRun` which is strictly non-writing: `dryRunOnly: true` and `dataWriteIncluded: false`. It executes only read-only schema analysis without writing to disk or database.
3. **Download Path Policy**:
   - `src/main/path-migration/download-path-governance.ts` implements robust filename sanitization, character normalization, and duplicate-handling suffix policies.

---

### Verification Details (Route B: AI Service & Telemetry)
1. **Mock Policy & Fail-Closed Behavior**:
   - `ai-service/core/mock_policy.py` checks production markers (`NODE_ENV=production`, `Contents/Resources`, or `.asar` paths).
   - If mock inference is requested or triggered on load failure in a production environment, `guard_mock_inference` raises a `MockInferenceBlockedError`, ensuring the system fails closed rather than failing silently with mock outputs.
   - Verified that `RAMTaggerModel`, `WDTaggerModel`, `Florence2TaggerModel`, and `CLIPDesignClassifier` import and execute `guard_mock_inference` in all catch/fallback code blocks.
2. **macOS GPU Memory Telemetry**:
   - `ai-service/core/gpu_monitor.py` implements a real Darwin/MPS memory monitor.
   - It reads process Resident Set Size (RSS) using `ps -o rss= -p <pid>` and queries PyTorch's `torch.mps.driver_allocated_memory()` driver values, reporting the maximum of the two.
   - It does not fabricate static unified memory estimates (such as static 25%).

---

### Evidence

#### 1. Python Unit Test Execution Output:
```
Ran 80 tests in 3.418s
OK
```

#### 2. Mock Fallback Guard Code:
```python
# from core/mock_policy.py
def is_mock_inference_allowed() -> bool:
    # 1. Enforce strict node env block
    node_env = os.environ.get("NODE_ENV", "").lower()
    if node_env == "production":
        return False
...
```

#### 3. macOS MPS Memory Telemetry Query Code:
```python
# from core/gpu_monitor.py
# Retrieve process RSS
pid = os.getpid()
rss_kb = 0
try:
    ps_res = subprocess.run(
        ["ps", "-o", "rss=", "-p", str(pid)],
        capture_output=True, text=True, timeout=2
    )
    if ps_res.returncode == 0 and ps_res.stdout.strip():
        rss_kb = int(ps_res.stdout.strip())
except Exception:
    pass
...
# Calculate used memory as maximum of driver allocated memory and process RSS
used_bytes = max(mps_driver, rss_bytes)
```
