# DAM OCR exit boundary handoff — 2026-09-29

1. Read FINAL-HANDOFF.json (COMPLETED/STOP) and REPORT.md.
2. REVIEW-FINAL.md records independent review and its limits.
3. OCR-EXIT-ONLY.patch + before/ + after/ contain the exact 8-file delta against this task's initial WIP, not Git HEAD.
4. source/ has 134 related files, not the whole repository. AGGREGATE-SOURCES.json identifies those bytes. FINAL-SOURCES.json identifies the delta; they intentionally have different digests.
5. logs/ and EVIDENCE-MAP.json retain all 19 original checks, including 3 red/diagnostic results. No failure was discarded. Independent reviewer command output lives in the review agent conversation, not falsely duplicated as primary raw evidence.
6. WORKTREE-PROTECTION.json verifies 2697 pre-existing source/workspace files and unchanged index/staged content. Three new test files are approved additions; .ai-run evidence is separate.

Verification (read-only): `python3 verify-package.py /path/to/this.zip`.
The package contains neither actual model weights nor user library data. It does not authorize applying a patch, starting models, publishing, or another implementation batch. Verify your checkout before any application. No automatic continuation.
