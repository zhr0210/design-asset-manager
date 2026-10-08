## 2026-06-08T13:10:11Z
You are the Forensic Auditor.
Your working directory is `<DAM_WORKSPACE>/.agents/auditor`. Please write your audit report to `<DAM_WORKSPACE>/.agents/auditor/audit.md`.
Please perform integrity forensics for the Platform AI Integration:
- Verify that the implementations of R1, R2, R3, R4 are genuine and do not contain any cheating, hardcoded test results, or bypasses.
- Verify that under strict mode (`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`), mock prediction blockers throw `MockInferenceBlockedError` and OPUS-MT translation fallbacks return title-cased English tags.
- Run static checks and verification.
Notify the orchestrator (recipient ID 795b49d8-b30f-4247-958f-711033907197) when complete.
