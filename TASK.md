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

Harden Release Branding Evidence so a structurally plausible icon cannot be
treated as approved branding:

1. Require one shared `build/release-branding.json` approval record for both
   Windows and macOS.
2. Validate platform icon container structure and required high-resolution
   entries.
3. Bind each icon to its approved SHA-256 without exposing paths or digests in
   generated evidence.
4. Keep final assets absent until a human-approved brand source is provided.

## Current Slice Result

- Release branding verification now requires schema-valid approval metadata,
  a shared approval ID/date, fixed platform filenames, and SHA-256 bindings
  for both platform icons.
- ICO verification checks the image directory, payload boundaries, supported
  PNG/DIB payloads, and a 256x256 entry.
- ICNS verification checks container/chunk sizes and a high-resolution PNG
  chunk.
- Generated evidence contains only platform, architecture, approval metadata,
  and structured check results; it omits paths and digests.
- Missing approval, fake-header ICO, malformed containers, and digest mismatch
  fail closed in focused tests.
- No final branding assets or approval record have been added because no
  human-approved brand source exists in the repository.
- Focused release tests, typecheck, production build, docs/context checks,
  Runtime Package regression, packaging governance, and 142 Python tests
  passed locally. The full governance wrapper stopped only where the sandbox
  denied the Llama probe's loopback listener; all later subchecks were rerun
  directly and passed.
- Windows fast-forwarded to `7715dbf` and passed the complete
  `npm run ci:governance` suite, including the Llama loopback probe, with a
  clean worktree. Doctor reported only the expected inactive AI Worker warning.

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
npm run test-runtime-package-ipc-governance
python3 -m unittest discover ai-service/tests
```

Record skipped platform or UI validation with the reason and remaining risk.
