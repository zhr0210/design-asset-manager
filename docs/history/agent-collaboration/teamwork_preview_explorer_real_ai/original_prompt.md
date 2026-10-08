## 2026-06-06T06:37:01Z

You are the Codebase Explorer. Your working directory is `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_real_ai/`.

Please investigate the codebase to map the requirements and identify gaps:
1. R1. Platform AI Action Plan Execution:
   - How does `platform-ai-branch-status.projector.ts` project next actions?
   - How can we map 'runtime_dependency', 'model_artifact', and 'runtime_service' missing requirements to actionable setup tasks like 'install_dependencies', 'download_model_artifact', and 'start_runtime'?
   - Check the renderer UI (e.g. AI Console, Settings, or workflow pages) to see how Platform AI status and nextAction are consumed, how clicking them triggers the actions, and how UI routing can dynamically adjust based on evidence gaps.
2. R2. Real AI Evidence & Model Route Verification:
   - macOS MPS/ONNX execution probe dynamic caching and TTL. Check where the MPS and ONNX probes are executed, cached, and how to ensure both have a 5-minute TTL cache-expiration logic.
   - Qwen3-VL GGUF/mmproj path verification: how does the app check for local model files? How does it handle incomplete downloads (e.g., checking for .aria2 or temporary files)?
   - MLX route: locate the MLX route implementation. Decide whether to fully implement it or cleanly deprecate/remove it. (If deprecating/removing, identify all dangling imports, scripts, and configurations to clean up).
   - Windows CUDA/ONNX/Llama parity validation: find where Windows AI routes/evidence checks are done (or should be done) and how to establish parity with macOS.
3. R3. QA & Automated Validation:
   - Identify which test files are related to AI runtime, branch status, and model download.
   - Run typecheck and run all existing tests to check baseline health.

Write your findings to `analysis.md` and a clean handoff report to `handoff.md` in `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_real_ai/`. Keep the reports precise, citing files and lines.
