## 2026-06-08T07:07:34Z
Analyze the requirements for the macOS remaining phases in the Design Asset Manager codebase.
Your working directory is <DAM_WORKSPACE>/.agents/teamwork_preview_explorer_phase16_mac. Please create this directory if it doesn't exist, and write your analysis.md there.

Specifically, analyze:
1. Path Migration Execution (macOS):
   - Locate and examine `src/main/path-migration/path-migration-executor.ts` and its rollback/execute methods.
   - Design the exact IPC channels to be exposed in `src/main/ipc/path-governance.ipc.ts` and `src/preload/index.ts` for dry-run check, execution, and rollback.
   - Design the UI components in React (Settings panel/drawer) to show dry-run results (affected rows, missing files, proposed path mappings, collisions) and provide buttons for execution and rollback.
   - Determine how settings and DB path fields are backup-ed and rolled back on failure/cancellation.
2. OCR & Llama Dependency Auto-Installers:
   - Identify easyocr, rapidocr, paddleocr ONNX dependency installation scripts/utilities. Look at `ai-service/tools/install_macos_ai_deps.py` or similar.
   - Identify GGUF/mmproj downloader/installer triggers, and check if llama runtime panel has downloader flow.
   - Determine the IPC/preload bridge modifications needed to trigger these installations and report dynamic progress/status.
3. macOS Code Signing & Notarization:
   - Examine `build/entitlements.mac.plist`, `scripts/notarize.js`, and `package.json` / `electron-builder` configurations.
   - Explain how notarization and signing are configured, how manual local packaging can ingest credentials, and how to verify it.
4. Automated verification tests:
   - Identify existing tests (`scripts/path-governance-late-phases.test.ts`, etc.) and how they should be updated or added to verify the active migration, rollback, and installers.

Write a complete, structured analysis report to `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_phase16_mac/analysis.md` and then send a handoff message summarizing your findings.
