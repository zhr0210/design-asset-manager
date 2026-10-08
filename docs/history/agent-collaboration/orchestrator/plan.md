# Plan: Remaining Platform AI Integration

## Milestones

### Milestone 1: Exploration and Codebase Analysis
- Spawn an Explorer agent to analyze:
  - R1: Platform AI Action Plan Dynamic UI Wiring (action buttons on UI cards, IPC mappings).
  - R2: JoyCaption & Deep Visual Analysis Realization (replacing mock Python endpoints with local Qwen3-VL/Llama, or hiding if unconfigured).
  - R3: Fail-Closed Tagging & Translation Fallbacks (blocking silent mock tagging/translation, cooperative model state machine).
  - R4: Real AI Evidence Validation (macOS MPS, ONNX, Llama GGUF/mmproj checks, 5-minute TTL caching).
- Explorer must identify specific files, scripts, endpoints, and test targets.

### Milestone 2: Implementation of AI Integration & Verification
- Spawn a Worker to implement the changes outlined by the Explorer.
- The Worker must update the project's `TASK.md` ledger.
- The Worker must write/update focused TypeScript and Python tests.
- The Worker must verify that `npm run ci:governance`, `npm run typecheck`, `npm run build`, and Python unit tests pass.

### Milestone 3: Review and Adversarial Challenge
- Spawn 2 Reviewers independently to check correctness, robustness, and constraint conformance.
- Spawn 2 Challengers to verify code correctness, run tests, and perform edge-case verification.

### Milestone 4: Forensic Audit and Acceptance Gate
- Spawn a Forensic Auditor to verify integrity and compile audit report.
- Verify 100% test pass, clean audit, and confirm the project is in a production-ready state.

---

## Execution Strategy
1. **Explore**: Dispatch Explorer to map files and details.
2. **Execute**: Dispatch Worker to apply implementation and update project files.
3. **Verify**: Dispatch Reviewers, Challengers, and Auditor.
4. **Report**: Aggregate outcomes and send final message to Sentinel.
