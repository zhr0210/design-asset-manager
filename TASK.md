# Current Task

## Long-Term Goal

Complete the cross-platform maintainability and delivery closure for Design
Asset Manager.

Windows and macOS should share product workflows, contracts, main-process
orchestration, UI state, and tests by default. Branch only for real OS,
runtime, native dependency, packaging, path, or process differences.

## Accepted Baseline

- Real AI Evidence Closure Phase 2 is complete on
  `codex/windows-ai-real-evidence`.
- Windows CUDA, WD Tagger ONNX, CLIP ONNX, and Llama GGUF/mmproj routes have
  real execution evidence.
- macOS WD Tagger ONNX and CLIP ONNX routes have real execution evidence.
- OCR has an explicit generated-image probe on both platforms, but it remains
  evidence-insufficient until dependencies and local model artifacts are
  separately approved and installed.
- Platform AI Branch Status contracts, dedicated macOS/Windows IPC channels,
  shared workflow status, and executable Platform AI Action Plan routing are
  stable.
- Product AI execution fails closed instead of returning simulated model
  output.
- The current branch is pushed to GitHub but is not contained in `main`.

## Current Slice

Prepare the Runtime Package renderer boundary without creating an unapproved
public IPC surface:

1. Project internal session responses through an explicit main-process
   allowlist.
2. Prove local paths, archive metadata, digests, progress history, rollback
   details, and unknown future fields cannot leak to the renderer.
3. Fix the proposed channel names and polling model in the nearest module
   documentation.
4. Keep IPC registration, shared public contracts, preload methods, renderer
   callers, and UI out of scope until explicit approval.

## Current Slice Result

- Added a main-process-only projector for selection, execution acceptance, and
  execution status responses.
- Renderer-facing objects are reconstructed from a stable allowlist; internal
  session and executor objects are never returned by reference.
- Focused tests inject private paths, archive names, SHA-256 values, progress
  history, rollback plans, internal free-text messages, and unknown fields and
  prove they are removed.
- The proposed v1 channels are `runtime-package:select-local-manifest`,
  `runtime-package:execute-selection`, and
  `runtime-package:get-execution-status`, using polling without a progress
  event.
- No Runtime Package IPC channel, shared public IPC contract, preload method,
  renderer caller, executable action, or UI was added.
- Focused Runtime Package tests, typecheck, production build, 142 Python
  tests, docs/context checks, and the complete `ci:governance` suite pass.
- Electron/Playwright UI validation is intentionally skipped because this
  pre-approval slice has no renderer or UI surface.

## Signed Candidate Architecture Result

- The shared builder runner defaults to unsigned mode, scrubs signing and
  notarization variables, rejects protected option overrides, and always uses
  `--publish never`.
- Signed mode requires `DAM_RELEASE_SIGNING_APPROVED=true` and all
  platform-specific credential variables before electron-builder starts.
- Release Update Metadata binds version, product, channel, platform,
  architecture, artifact, blockmap, sizes, and SHA-256 values without paths.
- Release Trust Evidence verifies Authenticode on Windows and Developer ID,
  Hardened Runtime, nested signatures, notarization/staple, Gatekeeper, and
  DMG integrity on macOS without exposing certificate values or paths.
- Release Branding Evidence verifies platform icon structure and binds both
  icons to one path-free approval record. Missing assets, missing approval, or
  SHA-256 mismatch blocks signed candidates from being distributable.
- Release Branding Evidence focused tests, signed-workflow governance tests,
  typecheck, production build, docs sync, agent context check, and diff check
  passed locally. A full `ci:governance` rerun reached the Llama server probe,
  where sandboxed loopback listening was denied; two required sandbox
  escalation requests timed out before approval.
- Windows fast-forwarded to `6c03cb1` and passed the branding evidence,
  release-flow governance, signed-workflow, typecheck, and diff checks with a
  clean worktree.
- The manual signed-candidate workflow is gated by explicit dispatch input and
  platform GitHub Environment approval. It has read-only repository
  permissions and no publishing step.
- Signing secrets are scoped only to the signed build step, and signed jobs
  accept only `main` or `v*` tag refs.
- macOS Hardened Runtime entitlements were reduced to the Electron JIT memory
  minimum; broader protection-disabling entitlements were removed.
- A real unsigned macOS arm64 pack succeeded even with invalid fixture signing
  variables present, proving the default runner scrubs them before packaging.
- A current unsigned macOS arm64 DMG passed read-only mount, disposable app
  copy, isolated launch, detach, and temporary-root cleanup. Package Smoke no
  longer prints captured startup logs or local paths.
- Full governance, typecheck, production build, release-focused tests, plist
  validation, 142 Python tests, docs sync, and diff checks passed.
- No real signing or notarization credentials were read or used.

## Next Implementation Slice

Three gated slices remain:

1. Run one real signed Windows candidate and one real signed/notarized macOS
   candidate after credentials and platform environments are provisioned.
2. Expose Runtime Package Executor to the renderer only after the exact public
   IPC channel names and response contract are explicitly approved.
3. Add human-approved Windows `.ico`, macOS `.icns`, and their shared approval
   record; default Electron icons remain below `distribution_ready`.

Publishing remains a separate per-release approval after distribution gates
and Release Update Metadata pass.

## Signed Candidate Preflight Result

- Added a shared signed-candidate preflight shape for Windows and macOS that
  records required environment names, approval input, ref gate, required
  evidence files, Package Smoke, and disabled publishing without reading
  secret values.
- Added a focused workflow contract test that checks both platforms remain
  behind GitHub Environment approval, `signing_approved`, `main` or `v*` refs,
  release evidence artifacts, Package Smoke, read-only repository permissions,
  and no publish command.
- Focused release preflight tests, signed-workflow tests, release-flow tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  diff checks, and the complete `ci:governance` suite pass.

## Release Branding Preflight Result

- Added a shared release-branding preflight shape that records the required
  approval file, Windows `.ico`, macOS `.icns`, approval fields, evidence
  checks, and default Electron icon block without reading real icon assets.
- The existing branding evidence verifier remains responsible for real
  container validation and approved SHA-256 matching.
- Focused branding preflight/evidence tests, typecheck, production build,
  142 Python tests, agent context, docs sync, diff check, and the complete
  `ci:governance` suite pass.
- Hardened the real AI runtime process runner test to wait for stdout evidence
  instead of relying on a fixed short sleep observed as flaky during full
  governance.

## Runtime Package IPC Preflight Result

- Added a pending-approval Runtime Package IPC contract preflight that records
  the three proposed channel names, polling-only v1 shape, no progress event or
  cancellation, main-owned native dialog behavior, renderer field allowlists,
  and excluded path/digest/message/progress/rollback fields.
- This remains main-process local only. It does not register IPC, add a shared
  public contract, expose preload APIs, or add renderer callers.
- Focused Runtime Package IPC preflight/projector/no-IPC governance tests,
  typecheck, production build, 142 Python tests, docs sync, diff check, and the
  complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the llama server probe; Doctor CI still reports
  the expected warning that the AI Worker port is not reachable because the
  worker was not started for this slice.

## Release Readiness Summary Result

- Added a shared release readiness summary that combines the existing
  release-promotion state machine with signed-candidate and branding preflight
  shapes.
- The summary emits one path-free shape for Windows and macOS with stage,
  candidate/distribution/publish booleans, signing environment, approval gate,
  required evidence, required secret names, branding approval file, platform
  icon file name, and structured blockers split by candidate/distribution/
  publish phase.
- The summary does not read secret values, icon bytes, candidate artifacts, or
  local paths. It is a readiness projection only and does not sign, notarize,
  publish, or validate real branding assets.
- Focused readiness/flow/signed-preflight/branding-preflight tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check, and
  the complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the llama server probe; Doctor CI still reports
  the expected warning that the AI Worker port is not reachable because the
  worker was not started for this slice.

## Release Readiness Evidence Writer Result

- Added a path-free `write-release-readiness-summary.mjs` artifact writer that
  reads generated checksum, update metadata, trust, branding, and Package Smoke
  evidence and writes `release-readiness-summary-<platform>-<arch>.json`.
- Added `--output=<path>` to Package Smoke so signed-candidate workflows can
  retain Package Smoke evidence without shell redirection.
- Signed Windows and macOS candidate workflows now upload Package Smoke and
  release-readiness summary JSON next to the checksum, update metadata, trust,
  and branding evidence.
- Static Package Smoke satisfies only the common Package Smoke gate. Windows
  Sandbox installer checks or macOS DMG install checks are still required for
  the distribution gate to pass.
- The writer does not read secret values, icon bytes, candidate binaries
  directly, model artifacts, user assets, or local paths; it consumes generated
  path-free evidence files.
- Focused release readiness writer, signed-candidate preflight, signed
  workflow, release-flow, Package Smoke tests, typecheck, production build,
  142 Python tests, agent context, docs sync, diff check, and the complete
  `ci:governance` suite pass. The full governance run required unsandboxed
  local loopback for the llama server probe; Doctor CI still reports the
  expected warning that the AI Worker port is not reachable because the worker
  was not started for this slice.

## Release Readiness Stage Coverage Result

- Strengthened the writer contract test with isolated Windows and macOS
  fixtures.
- Static Package Smoke now has focused coverage proving it can satisfy only
  the candidate Package Smoke gate; Windows Sandbox or macOS DMG install smoke
  remains required before `distribution_ready`.
- Windows Authenticode and macOS Developer ID, Hardened Runtime, nested
  signature, notarization, staple, and Gatekeeper evidence are covered through
  generated path-free trust fixtures.
- Explicit publish approval remains the only transition from
  `distribution_ready` to `publish_ready`.
- This slice adds no signing, notarization, public IPC, UI surface, release
  publishing, real icon assets, model downloads, or user-asset access.
- Focused release readiness writer/summary/preflight/workflow tests,
  typecheck, production build, 142 Python tests, agent context, docs sync,
  diff check, and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Runtime Package Executor Result

- Added a shared execution interface and structured, path-free progress/result
  vocabulary.
- Added filesystem and in-memory adapters.
- Filesystem execution is limited to explicitly confirmed local/bundled ZIP
  packages and blocks model packages, remote sources, package scripts, and
  automatic runtime start.
- Relative bundled sources resolve from an injected or Electron resource root;
  local and bundled source/access pairs are validated before file access.
- SHA-256 verification, safe extraction, atomic promotion, Runtime Registry
  commit, and rollback are implemented behind one module interface.
- Filesystem executions are serialized inside the main process so concurrent
  package requests cannot overwrite each other's Runtime Registry snapshot.
- Generated ZIP tests cover success, duplicate install, checksum mismatch,
  traversal, Windows drive paths, case collisions, symbolic links, entry
  and expanded-size limits, source-root escape, managed-parent symlinks,
  platform mismatch, and registry rollback.
- Typecheck, production build, runtime-safety tests, 142 Python tests, and
  unsigned macOS packaging passed. The complete `ci:governance` suite also
  passed after restoring the local `better-sqlite3` Node ABI changed by the
  packaging step.
- The packaged app contains `extract-zip` and its runtime dependencies. An
  isolated temporary-home startup remained running without module errors.
- An earlier non-isolated startup smoke unintentionally reached the existing
  default runtime SQLite initialization path before termination. No database
  content or user asset was inspected, and no cleanup or rollback was
  attempted. Future package smoke must use isolated roots only.
- A main-process session boundary now adapts a user-selected local manifest
  into opaque selection tokens and path-free execution snapshots, but it is not
  exposed to renderer IPC until the channel contract is explicitly approved.

## Later Slices

1. Validate the Runtime Package Executor on macOS and Windows with generated
   fixtures, focused tests, and Electron/Playwright UI evidence.
2. Add an explicitly approved remote-package adapter without weakening the
   local/bundled transaction rules.
3. Deepen Release Flow around signed Windows artifacts, signed/notarized macOS
   artifacts, Package Smoke, gated publishing, and update metadata.

## Release Candidate Governance Result

- Added one shared promotion invariant for Windows and macOS with structured
  missing gates and four truthful stages.
- Added a path-free SHA-256 artifact manifest writer for NSIS/DMG candidates.
- The manual packaging workflow now runs release-focused tests and retains
  unsigned candidate artifacts for 14 days after architecture-aware static
  Package Smoke, without signing or publishing.
- Unsigned artifacts can reach only `candidate_ready`. Distribution and
  publishing remain blocked until platform trust evidence, update metadata,
  and explicit publish approval exist.
- The inspected local macOS app is ad hoc signed, has no Team ID, and is not a
  distribution artifact. Local Gatekeeper output was inconclusive because
  system security assessment is disabled.
- A real unsigned macOS arm64 DMG and blockmap were built locally. The
  architecture-scoped checksum manifest and static Package Smoke passed;
  read-only DMG installation and isolated launch also passed. Strict bundle
  signature verification failed as expected for the unsigned candidate, so
  its truthful ceiling is `candidate_ready`.
- The complete `ci:governance` suite passed with the release invariant,
  checksum, Package Smoke, and workflow contract tests included.
- Windows full-governance validation exposed and fixed a CRLF-sensitive
  Settings Migration preload contract test. The test now normalizes line
  endings and fails explicitly when its structural boundaries are absent.
- Windows also exposed a native ABI ordering gap: `npm ci` rebuilt
  `better-sqlite3` for Electron before Node-driven governance tests.
  `ci:governance` now begins with `ci:prepare-native-deps`; packaging still
  rebuilds Electron native dependencies when producing the artifact.
- Windows NSIS packaging then exposed a second divergent path: the npm dist
  script attempted a redundant Electron download through an invalid inherited
  proxy while Package Smoke already knew how to use the installed Electron
  distribution. All packaging entry points now share one runner that derives
  the installed Electron version, uses its local dist, disables signing and
  publishing, and removes inherited proxy variables.
- Windows x64 NSIS packaging, artifact checksum generation, static Package
  Smoke, and disposable Windows Sandbox installation all passed. Signing is
  intentionally absent, so the candidate remains below distribution-ready.

## Safety Boundaries

- Do not inspect user assets, runtime databases, model caches, or model
  weights.
- Do not download models, packages, or dependencies without explicit approval.
- Do not use or print signing, notarization, publishing, or authentication
  secrets.
- Preserve ADR-0002 user-triggered external/runtime behavior.
- Preserve ADR-0003 dry-run, backup, rollback, and explicit confirmation for
  path migration.
- Do not stage or revert unrelated working-tree files.

## Validation

For the current documentation slice:

```bash
python3 scripts/check-agent-context.py
python3 scripts/check-forbidden-paths.py
python3 scripts/check-docs-sync.py --mode phase-summary
git diff --check
```

Before completing an executable Runtime Package slice:

```bash
npm run typecheck
npm run build
npm run test-runtime-package-source
npm run test-runtime-package-downloader
npm run test-runtime-package-verifier-extractor
npm run test-runtime-package-installer
npm run ci:test-runtime-safety
npm run test-runtime-package-session
npm run test-runtime-package-ipc-contract-preflight
npm run test-runtime-package-ipc-governance
python3 -m unittest discover ai-service/tests
```

Record skipped platform or UI validation with the reason and remaining risk.
