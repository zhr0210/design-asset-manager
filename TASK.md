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

Add a shared Release Signing Environment Status verifier:

1. Validate a manually supplied, sanitized
   `release-signing-environment-evidence.json` record against the shared
   Windows/macOS release environment manifest.
2. Check GitHub Environment presence, reviewer approval, and required signing
   secret names without reading secret values.
3. Emit a path-free `release-signing-environment-status.json` result for
   reviewers before triggering a real signed candidate run.
4. Add a CLI writer, focused tests, governance wiring, and release docs.
5. Keep runtime behavior, IPC, preload, renderer callers, UI, model downloads,
   user assets, candidate binary reads, release secrets, GitHub settings
   reads/mutation, signing, notarization, workflow execution, and publishing
   out of scope.

## Current Slice Result

- Added `release-signing-environment-status.ts`, a shared path-free verifier
  for sanitized GitHub signing environment evidence.
- Added `write-release-signing-environment-status.mjs`, which consumes
  `release-signing-environment-evidence.json` and writes
  `release-signing-environment-status.json` before a real signed candidate
  run.
- The verifier checks GitHub Environment presence, reviewer approval, and
  required signing secret names for Windows and macOS. It reads names only and
  never reads secret values, signing assets, GitHub settings, local paths,
  candidate binaries, user assets, model artifacts, or runtime databases; it
  also does not mutate GitHub settings, execute workflows, sign, notarize,
  publish, or expose IPC/UI.
- Added focused signing-environment status/writer coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the pre-dispatch signing
  environment verification step.
- Focused signing-environment, environment manifest, signed-candidate
  preflight, external-gate, evidence-bundle, and release-flow tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Release Evidence Bundle Status Result

- Added `release-evidence-bundle-status.ts`, a shared path-free verifier for
  collected `release-external-gate-status-*.json` evidence.
- Added `write-release-evidence-bundle-status.mjs`, which verifies an explicit
  Windows/macOS platform and architecture set against `distribution_ready` or
  `publish_ready` and writes `release-evidence-bundle-status.json`.
- The verifier reads generated JSON evidence only. It does not read candidate
  binaries, release secrets, signing assets, branding asset bytes, GitHub
  settings, user assets, model artifacts, runtime databases, or local paths
  into output; it also does not execute workflows, sign, notarize, mutate
  GitHub settings, publish, or expose IPC/UI.
- Added focused bundle verifier/writer coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the post-run bundle
  verification step.
- Focused bundle, external-gate, readiness, and release-flow tests, typecheck,
  production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Aggregate Release Gate Status Result

- Added a shared aggregate `summary` to Release External Gate Status with
  `overallStatus`, gate counts, and structured `nextExternalActions`.
- The aggregate summary is derived from the existing per-platform readiness
  evidence and keeps platform differences inside each gate entry.
- The status remains display-only and path-free: no workflow execution, GitHub
  mutation, release publishing, secret reads, signing asset reads, branding
  asset byte reads, runtime behavior, IPC, preload, renderer caller, UI,
  model download, or user asset behavior changed.
- Focused external gate status/writer tests, typecheck, production build,
  142 Python tests, docs sync, agent context, forbidden-path advisory check,
  diff check, and the complete `ci:governance` suite pass. The first sandboxed
  `ci:governance` attempt failed because the Llama server probe could not
  listen on `127.0.0.1`; the same command passed after loopback permission was
  granted. Doctor CI still reports the expected AI Worker not-reachable
  warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Structured Publish Approval Result

- Added `release-publish-approval.ts`, a shared path-free validator for
  optional `release-publish-approval.json` records.
- A valid publish approval must match platform and architecture, use schema
  version 1, include a safe approval id, ISO approval timestamp,
  `distributionStage: distribution_ready`, and `publishApproved: true`.
- `write-release-readiness-summary.mjs` now supports
  `--publish-approval=<path>` and can use that structured approval evidence to
  mark a distribution-ready candidate as `publish_ready`.
- The existing `--publish-approved=true` compatibility flag is preserved.
- Added `test-release-publish-approval` and strengthened
  `test-release-readiness-writer` with structured approval success and
  mismatch coverage.
- Wired the publish approval test into `.codeindex/tests-map.json` and
  `ci:governance`.
- Updated `docs/platform/RELEASE_FLOW_GOVERNANCE.md` and
  `docs/platform/CI_MATRIX.md` to document structured publish approval as
  evidence only.
- No runtime behavior, IPC, preload, renderer caller, UI surface, model
  download, user asset, signing, notarization, GitHub Environment mutation, or
  release publishing behavior changed.
- Focused publish approval/readiness writer/external gate tests, typecheck,
  production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. The first sandboxed `ci:governance` attempt
  failed because the Llama server probe could not listen on `127.0.0.1`; the
  same command passed after loopback permission was granted. Doctor CI still
  reports the expected AI Worker not-reachable warning because the worker is
  not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence and CLI governance only and has no renderer
  surface.

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

## Signed Candidate Workflow Ordering Result

- Strengthened the signed-candidate workflow contract test so both Windows and
  macOS jobs must run governance, signed packaging, checksum, update metadata,
  trust evidence, branding evidence, static Package Smoke, release readiness
  writing, and artifact upload in that order.
- The workflow test now proves Release Readiness Summary consumes the static
  Package Smoke JSON before upload and that the signed-candidate workflow does
  not pass `publish-approved=true`.
- Static Package Smoke remains a candidate evidence gate only; Windows Sandbox
  installer smoke, macOS DMG install smoke, and explicit publish approval stay
  separate gates.
- This slice adds no signing, notarization, public IPC, UI surface, release
  publishing, model downloads, or user-asset access.
- Focused signed workflow/preflight/readiness writer tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check,
  and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Release Branding Approval Template Result

- Added `build/release-branding.example.json` as the shared Windows/macOS
  human approval template for release icon digests.
- The template intentionally contains invalid placeholder SHA-256 values so it
  cannot be used as a real `build/release-branding.json` approval record.
- Added a focused test that generates valid ICO/ICNS containers, runs the real
  branding verifier with the example template, and proves the template blocks
  at `branding_approval`/`approved_digest` while still keeping output path-free.
- This slice adds no real icon assets, signing, notarization, public IPC, UI
  surface, release publishing, model downloads, or user-asset access.
- Focused release branding template/preflight/evidence tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check,
  and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Release Environment Manifest Result

- Added a shared release environment manifest that maps Windows and macOS
  signed-candidate requirements to GitHub Environment names, workflow jobs,
  runners, supported architectures, approval gates, required secret names,
  required evidence artifacts, branding files, and platform install-smoke
  gates.
- The manifest is a read-only configuration contract: it does not read secret
  values, signing assets, branding bytes, local paths, or GitHub settings, and
  it does not sign, notarize, publish, or modify repository environments.
- Focused manifest/preflight/readiness/workflow tests, typecheck, production
  build, 142 Python tests, agent context, docs sync, diff check, and the
  complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the Llama server probe; Doctor CI still
  reports the expected warning that the AI Worker port is not reachable because
  the worker was not started for this slice.

## Release Install Smoke Preflight Result

- Added a shared release install-smoke preflight that names the Windows
  Sandbox installer-smoke and macOS DMG install-smoke gates, their
  `package-smoke` evidence source, required check IDs, execution host, and
  disposable isolated-install behavior.
- Release Environment Manifest now consumes this shared preflight instead of
  hardcoding platform install-smoke branches, while still keeping the platform
  differences limited to the smoke lane and check IDs.
- Focused install-smoke/environment/readiness-writer/Package Smoke tests,
  typecheck, production build, 142 Python tests, agent context, docs sync,
  diff check, and the complete `ci:governance` suite pass. The full
  governance run required unsandboxed local loopback for the Llama server
  probe; Doctor CI still reports the expected warning that the AI Worker port
  is not reachable because the worker was not started for this slice.

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
