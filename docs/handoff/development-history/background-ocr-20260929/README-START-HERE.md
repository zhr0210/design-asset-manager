# DAM background OCR handoff — 2026-09-29

1. FINAL-HANDOFF.json is authoritative: COMPLETED/STOP; production WAITING_QUALIFICATION.
2. REPORT.md explains implementation, actual checks, failures and NOT_RUN. REVIEW-FINAL.md
   separates the independent 35-case replay from inspected primary logs.
3. BACKGROUND-OCR-ONLY.patch + before/ + after/ contain the 36-file delta against initial WIP,
   not HEAD. The primary patch preserves files without a trailing newline. history/ retains a
   superseded initial patch for audit only; do not apply it.
4. source/ contains 148 related files, not a complete repository. AGGREGATE-SOURCES.json
   binds those bytes; FINAL-SOURCES.json binds the 36-file delta including TASK.md.
5. logs/ contains 37 primary command records (including 6 historical failures).
   independent-review/ contains the reviewer's actual additional 35-case replay stdout,
   forwarded through the agent conversation and archived by the primary writer.
6. SCHEMA.proposed.sql and SCHEMA-REVIEW.md describe the independently reviewed v13 seam.
   A new library remains v1; production has no qualified model envelope. The test qualifier
   requires isolated synthetic E2E mode and is not a Runtime qualification method.
7. WORKTREE-PROTECTION.json covers 2700 initial files and unchanged index/staged content.
   22 existing files changed, 14 new files were added; unrelated WIP is retained.

Read-only archive verification: `python3 verify-package.py /path/to/this.zip`.
No models, user libraries, installer or release is included. Review your current checkout
before applying any patch. This package does not authorize further execution or publication.
