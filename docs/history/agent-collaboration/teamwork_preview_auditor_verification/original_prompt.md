You are a forensic auditor subagent. Your task is to perform an integrity verification audit on the implemented changes for Route A and Route B in the Design Asset Manager project.

Please audit the codebase to verify:
1. Authentic implementation of Route A:
   - Check `src/main/path-migration/` files. Ensure they enforce non-destructive boundaries (`autoMoveFiles: false`, `autoDeleteFiles: false`, `autoUpdateFilePath: false`).
   - Check the dry-run report logic. Ensure it generates a structured missing file report without writing to the database or moving/deleting user files.
   - Check the download save path policy.
2. Authentic implementation of Route B:
   - Verify that pure mock PromptWorker and AnalysisWorker endpoints in the Python AI worker are disabled, hidden, or replaced with real Qwen3-VL Llama/OpenAI-compatible routes, and do not return hardcoded mock outputs in production.
   - Verify that Python model wrappers (RAM++, Florence-2, CLIP, WD Tagger) fail closed (i.e. raise exceptions) in production/packaged mode when weights/dependencies are missing, instead of silently falling back to mock tags/captions.
   - Verify that macOS memory/telemetry reporting for MPS/Metal captured in `ai-service/core/gpu_monitor.py` or similar telemetry reports actual process-level GPU memory (using `ps` RSS or `torch.mps` drivers) instead of a static unified memory estimation (e.g. static 25%).
3. Non-circumvention check:
   - Ensure that there is no hardcoding of test results or expected verification strings in the codebase or unit tests.
   - Ensure no facade/dummy implementations have been introduced that bypass the intended functionality.

Document all findings in `audit_report.md` and deliver `handoff.md` with your audit verdict (CLEAN or VIOLATION detected) and a brief summary of the evidence. Send a message back to the orchestrator (conversation ID: d3ac1110-d660-40cf-9486-ee67f50e8f8b).

## 2026-06-05T14:29:30Z
Verify the following:
1. Authentic implementation of Route A in `src/main/path-migration/` (non-destructive boundaries, dry-run report, download save path policy).
2. Authentic implementation of Route B in `ai-service/core/` and other files (mock PromptWorker/AnalysisWorker disabled in production, fail-closed model wrappers for RAM++, Florence-2, CLIP, WD Tagger, and process-level GPU memory telemetry).
3. Non-circumvention check: check for any hardcoded test outputs or facade implementations.

Document findings in audit_report.md and write a handoff report to handoff.md. Send a message back to parent d3ac1110-d660-40cf-9486-ee67f50e8f8b with your verdict (CLEAN or VIOLATION detected) and a summary of your evidence.
