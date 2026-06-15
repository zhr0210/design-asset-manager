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

Establish one truthful integration and documentation baseline before adding
new runtime installation behavior:

1. Replace stale Phase 1 and historical validation language in active docs.
2. Mark completed shared-architecture roadmap slices as complete.
3. Keep only the latest sanitized Windows evidence and a reusable validation
   guide.
4. Record the next implementation seam as Runtime Package Executor.
5. Do not change source behavior, IPC channels, AI Worker HTTP contracts,
   database schema semantics, or user data.

## Current Slice Result

- Active architecture and evidence docs now describe the implemented baseline.
- Historical Windows handoff/result documents were reduced to reusable
  validation instructions and the latest sanitized evidence.
- The shared architecture roadmap now separates completed AI foundation work
  from Runtime Package Executor and Release Flow work.
- Agent context, docs sync, diff checks, path-governance docs, release
  governance, and runtime-package installer contract tests passed.
- `check-forbidden-paths.py` reported the expected approved `docs/` edits and
  unrelated pre-existing `docs/agents/` files; no forbidden runtime or user
  data was read or modified.

## Next Implementation Slice

Deepen Runtime Package installation behind one main-process Runtime Package
Executor interface.

The first executable slice is limited to explicitly selected local or bundled
packages. It must provide:

- staging under an app-managed temporary root;
- SHA-256 verification before extraction;
- archive traversal and target-root checks;
- atomic promotion into an app-managed runtime root;
- Runtime Registry metadata update only after promotion succeeds;
- rollback of created files and metadata on failure;
- structured progress and failure results;
- an in-memory adapter for interface-level tests;
- no remote download, package script execution, privilege escalation, model
  download, or automatic runtime start.

Any renderer operation must remain user-triggered. Windows and macOS share the
executor workflow while archive, executable, quarantine, and signing behavior
may use platform adapters.

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
  strict bundle signature verification failed as expected for the unsigned
  candidate, so its truthful ceiling is `candidate_ready`.
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
python3 -m unittest discover ai-service/tests
```

Record skipped platform or UI validation with the reason and remaining risk.
