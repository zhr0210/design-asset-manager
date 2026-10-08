# Runtime Package Executor

The Runtime Package Executor is the first executable package-management slice.
It keeps the existing dry-run planner and adds a separate transaction module.

## Supported

- explicitly confirmed local or bundled ZIP sources;
- bundled sources resolved from an injected or Electron resource root;
- runtime, tool, and dependency package types;
- managed-runtime and extract-only install modes;
- SHA-256 verification;
- managed staging and safe ZIP extraction;
- symbolic-link, path-traversal, entry-count, and expanded-size rejection;
- managed destination parent symlink rejection;
- atomic promotion inside the managed runtime root;
- main-process serialization to prevent concurrent Runtime Registry lost updates;
- Runtime Registry commit after promotion;
- filesystem and in-memory adapters;
- rollback when registry commit fails;
- main-process local manifest sessions that keep manifest paths, archive
  paths, and source roots out of renderer-facing responses.

## Blocked

- remote sources and network access;
- model packages;
- package scripts;
- privilege escalation;
- automatic runtime start;
- overwrite of an installed package version;
- archives outside the approved source root.

Execution results are structured and path-free. Full install paths remain
inside the Runtime Registry and are not emitted as progress or result text.

## Local Manifest Session

`RuntimePackageSessionService` is the internal main-process boundary intended
for the future renderer IPC surface. It accepts a user-selected sidecar
`runtime-package.json`, validates the manifest, requires exactly one selected
entry, binds it to a sibling ZIP by size and SHA-256, and returns only an
opaque selection token plus path-free package preview.

Executing a selection consumes the token, requires explicit confirmation, and
records a path-free execution snapshot. The service caches progress and final
result by execution id so a future UI can poll or subscribe without receiving
local paths or trusted package metadata from the renderer.

Completed execution snapshots are retained only inside a bounded main-process
cache. Running executions are protected from pruning; terminal snapshots are
removed after the configured retention window or when the completed-execution
limit is exceeded.

The approved product flow registers polling-only IPC channels without adding
cancel semantics or weakening the executor policy for remote packages, model
packages, package scripts, or automatic runtime start.

`runtime-package-session.projector.ts` defines the main-process-owned renderer
projection for the public surface. It reconstructs selection and
execution responses from an explicit allowlist instead of passing session
objects through. Archive names, SHA-256 values, local paths, progress history,
rollback details, internal free-text messages, and unknown future executor
fields remain inside the main process. The Chinese UI derives localized copy
from structured stage and error codes rather than displaying internal English
messages.

GitHub Issue #3 approved the first public surface:

- `runtime-package:select-local-manifest`;
- `runtime-package:execute-selection`;
- `runtime-package:get-execution-status`.

The first version uses status polling rather than a progress event.
Selection opens and owns the native file dialog in the main process; the
renderer supplies only a selection token for confirmed execution and an
execution id for status polling. The shared contract, main-process IPC,
preload methods, and AI Console Runtime panel all use the same Windows/macOS
surface.

`runtime-package-ipc-contract-preflight.ts` now records the approved v1 shape.
The shared contract locks the channel names, polling model, renderer-visible
field allowlists, and excluded path/digest/message/progress/rollback fields.

`npm run test-runtime-package-ipc-governance` keeps that boundary explicit. It
fails if the three channel literals drift, the main/preload/renderer wiring is
missing, or renderer code accesses private path, digest, session, executor, or
rollback fields.

## Validation

```bash
npm run test-runtime-package-executor
npm run test-runtime-package-session
npm run test-runtime-package-session-projector
npm run test-runtime-package-test-hygiene
npm run test-runtime-package-ipc-contract-preflight
npm run test-runtime-package-ipc-governance
npm run test-runtime-package-ipc-handlers
npm run test-runtime-package-product-workflow
npm run test-runtime-package-panel
npm run test-runtime-registry
npm run typecheck
npm run build
```

The focused test generates ZIP fixtures under `dist-temp/tests` at runtime and
covers success,
duplicate install, checksum mismatch, traversal rejection, remote/model
blocking, managed-path symlink rejection, explicit confirmation, in-memory
interface behavior, and rollback. The session test covers sidecar manifest
selection, token expiry and one-time use, checksum binding, multi-package
manifest disambiguation, path-free responses, execution snapshots, bounded
snapshot retention, and Runtime Registry commit.

`npm run test-runtime-package-test-hygiene` keeps those generated fixtures
inside the existing CI hygiene allowance. It fails if Runtime Package tests
reintroduce top-level `dist-temp/runtime-*` or `dist-temp/outside-*` paths that
can poison a later governance run after an interrupted test.

The projector test injects private paths, archive metadata, digest values,
progress history, and rollback details into internal objects and proves none
of them cross the renderer boundary.

The product-flow tests additionally prove native-dialog cancellation remains a
structured response, opaque ids are validated, internal messages remain
private, piped execution snapshots preserve the allowlist, Chinese labels come
from structured stage/error codes, polling stops at terminal state, and the
panel does not access physical paths or hashes.
