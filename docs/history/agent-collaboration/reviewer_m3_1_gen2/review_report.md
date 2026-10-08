# Design Asset Manager - AI Branch Status Dynamic UI & Capability Probing Cache Review Report

## Review Summary

**Verdict**: **APPROVE**

The implementation of R1 (Platform AI Action Plan Dynamic UI Wiring) and R4 (Real AI Evidence Validation Cache) successfully satisfies the technical specifications and codebase style guidelines. Type checking, production building, and the full suite of specialized test scripts compile and pass cleanly without warnings or errors. 

The dynamic UI wiring provides precise button state projection mapping gaps to specific user actions. The 5-minute memory caching (TTL) for ONNX and Llama capability probing prevents performance degradation and thread-blocking in the Electron main process.

---

## Verified Claims

- **TypeScript Compilation and React Component Correctness**
  - Verified via `npm run typecheck` and `npm run build` → **PASS** (Zero errors or warnings during compilation and chunk generation).
- **Branch Status Display Projection Correctness**
  - Verified via `npm run test-platform-ai-branch-status-display` → **PASS** (Asserts state mapping, priority sorting, tone styling, and removal of duplicate display helpers in React component).
- **macOS AI Runtime Status Detection**
  - Verified via `npm run test-macos-ai-runtime` → **PASS** (Asserts correct system profiler query execution and Apple Silicon unified memory VRAM calculation).
- **Console macOS Branch Status Orchestration**
  - Verified via `npm run test-ai-console-macos-branch` → **PASS** (Validates integration of status selection and projector mapping).
- **Llama Runtime Installer Planning & Server Management**
  - Verified via `npm run test-llama-runtime-installer` → **PASS** (Validates zipslip prevention, log sanitization, plan generation, and model selection).

---

## Findings

### [Minor] Finding 1: Lack of Rate Limiting or Debounce on On-Demand Probing IPC
- **What**: The IPC handler for `aiRuntime:probeOnnxModelLoad` runs on-demand model load probing without checking if a probe is already running.
- **Where**: `src/main/ipc/ai-runtime.ipc.ts` (Lines 273-283)
- **Why**: If a user double-clicks or spams the refresh/probe action button in rapid succession, the main process launches concurrent asynchronous calls to load and compile the ONNX models, leading to high CPU/GPU spikes or OOM.
- **Suggestion**: Add a simple loading state or mutex in the main process to reject duplicate probing tasks while one is already active.

### [Minor] Finding 2: System Clock Alterations Can Bypass or Freeze Cache TTL
- **What**: The cache validation filters probes using `Date.now() - Date.parse(probe.checkedAt)`.
- **Where**: `src/main/ipc/ai-runtime.ipc.ts` (Line 155) and `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts` (Line 13).
- **Why**: If the user adjusts their system clock backward, the calculated age of the cache becomes negative, which makes it permanently look "fresh" (since `negative <= TTL`). If they adjust it forward, the cache expires immediately.
- **Suggestion**: Use `Math.abs()` or explicitly check for negative values (e.g. `const diff = Date.now() - checkedAt; return diff >= 0 && diff <= TTL`) or leverage a monotonic timer where available.

---

## Coverage Gaps & Unexplored Areas

- **Windows CUDA Diagnostics Execution in macOS Environment**: The Windows diagnostics (`nvidia-smi` parser code paths) were inspected statically but could not be verified dynamically due to the macOS runtime environment constraints.
  - *Risk Level*: **Low** (Code structure is isolated in platforms checks and has robust fallbacks).
  - *Recommendation*: Accept risk; script tests verify the code structure compiles successfully.

---

## Challenge Summary (Adversarial Critic)

**Overall risk assessment**: **LOW**

The solution demonstrates high resilience against common security vulnerabilities (e.g., zipslip escape checks are fully verified) and provides a clean separation between raw platform evidence and clean, translated UI projection.

---

## Adversarial Challenges

### [Medium] Challenge 1: Concurrent Llama Server Port Bind Failures
- **Assumption Challenged**: Port `8080` is assumed to be available for the local `llama-server`.
- **Attack Scenario**: If port `8080` is occupied by another local service (e.g., a dev server or proxy), `llama-server` fails to bind. The install service attempts health checks up to 20 times with 1-second delays, ultimately failing with `LLAMA_SERVER_VERIFY_TIMEOUT`.
- **Blast Radius**: The server fails to start, but the user is only notified of a timeout. 
- **Mitigation**: Perform a quick TCP socket check on port `8080` prior to spawning `llama-server`. If occupied, report a specific `PORT_IN_USE` error message rather than a generic timeout.

### [Low] Challenge 2: Log Sanitization Coverage for Non-Standard Paths
- **Assumption Challenged**: Log sanitization uses the regex `/[A-Za-z]:\\Users\\[^\\\s]+/g` to redact user directories.
- **Attack Scenario**: If a Windows user runs the application from a custom partition (e.g., `D:\CustomUsers\...`) or if path formatting uses forward slashes, user paths may bypass the regex.
- **Blast Radius**: Leakage of full user folder names in log files.
- **Mitigation**: Normalize all file path strings to standard Windows slashes before executing log sanitization, or broaden the regex to redact generic user profile paths.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| Zip Slip Path Traversal (e.g. `../escape.exe`) | Throw "不安全路径" error, prevent extraction | Throws as expected, aborts install | **PASS** |
| Log Sanitization of Secret Keys | Redact `sk-secret` to `[REDACTED_API_KEY]` | Redacts correctly | **PASS** |
| Cache Retrieval within 5-Minute TTL | Return cached evidence, avoid heavy probe execution | Reads from memory cache | **PASS** |
| Cache Expiry > 5 Minutes | Invalidate cache, force fresh evaluation / fallback | Evicted from evidence array | **PASS** |
