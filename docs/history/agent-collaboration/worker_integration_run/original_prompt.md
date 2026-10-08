## 2026-06-08T10:16:00Z
You are the Platform AI Worker.
Your working directory is `<DAM_WORKSPACE>/.agents/worker_integration_run`.
Please read `<DAM_WORKSPACE>/.agents/worker_integration_run/instructions.md` for the detailed requirements (R1, R2, R3, R4) and instructions.
Please also read:
- `<DAM_WORKSPACE>/.agents/explorer_integration_probe/analysis.md`
- `<DAM_WORKSPACE>/.agents/explorer_integration_probe/handoff.md`
- `AGENTS.md`
- `TASK.md`

Your tasks are:
1. Update `TASK.md` under the workspace root to indicate you are starting the work.
2. Implement R1 (UI wiring of action plan triggers in AiConsolePage.tsx and platform-ai-action-plan.workflow.ts).
3. Implement R2 (real local/external OpenAI-compatible routes for JoyCaption & Qwen-VL in the Python worker; fail-closed under strict mode).
4. Implement R3 (blocking silent mock predictions for cooperative taggers and translation in Python; tracking the 5-state model state machine; fallback to title-cased English names for translation errors with `"localized_by": "fallback"`).
5. Implement R4 (checking MPS/ONNX/Llama evidence caching with a 5-minute TTL).
6. Verify your implementation by running typecheck, build, and Python tests.
7. Update `TASK.md` to indicate you are done and details of the verification.
8. Deliver a handoff/completion report to `<DAM_WORKSPACE>/.agents/worker_integration_run/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please send a message to recipient ID 795b49d8-b30f-4247-958f-711033907197 when you are done.
