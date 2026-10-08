## 2026-06-05T12:32:15Z

You are the Read-Only Exploration Agent. Your working directory is `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_exploration`.

Please investigate the codebase to map out the implementation files and design the strategy for:
1. Route A: Asset Library Path Governance (Phase 14A & Phase 14B):
   - Locate and analyze `src/main/path-migration/asset-library-path-governance.ts` and `src/main/path-migration/download-path-governance.ts`.
   - See how path checks are currently performed. Find how we can implement a dry-run report for asset library path checking and missing file reports without writing to the database or moving/deleting user assets.
   - Confirm strict compliance with path governance boundaries (`autoMoveFiles: false`, `autoDeleteFiles: false`, `autoUpdateFilePath: false`).
   - Find how to implement the download save path policy.
2. Route B: AI Worker Mock and Planned Capability Remediation:
   - Identify where PromptWorker and AnalysisWorker endpoints/classes are in `ai-service/workers/prompt_worker.py` and `ai-service/workers/analysis_worker.py`. How can we hide or replace them with real Qwen3-VL Llama/OpenAI-compatible routes, or disable them in production?
   - Look at the model wrappers (RAM++, Florence-2, CLIP, WD Tagger, etc.) in `ai-service/models/`. How do they handle mock fallbacks? How can we improve them to fail closed (raise errors) in packaged/production mode or when `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1` is enabled if a mock fallback would be triggered?
   - Examine how macOS GPU/MPS telemetry is collected in `ai-service/core/gpu_monitor.py` or `src/main/services/ai-worker/ai-gpu-monitor.service.ts` or similar. How can we show process-level GPU usage for MPS/Metal instead of static unified memory estimation?
3. Verification:
   - Locate related tests in `scripts/`, `dist-temp/tests/`, and `ai-service/tests/`. Find out how to run them and check if they currently pass or fail.

Please write a structured investigation report to `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_exploration/analysis.md` and complete a handoff report at `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_exploration/handoff.md`. Communicate back when done.
