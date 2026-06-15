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

The first session slice does not register IPC channels, does not add cancel
semantics, and does not weaken the executor policy for remote packages, model
packages, package scripts, or automatic runtime start.

`npm run test-runtime-package-ipc-governance` keeps that boundary explicit. It
fails if a `runtime-package:*` IPC channel, preload API, renderer caller, or
shared IPC contract appears before the public channel contract is approved.

## Validation

```bash
npm run test-runtime-package-executor
npm run test-runtime-package-session
npm run test-runtime-package-ipc-governance
npm run test-runtime-registry
npm run typecheck
npm run build
```

The focused test generates ZIP fixtures at runtime and covers success,
duplicate install, checksum mismatch, traversal rejection, remote/model
blocking, managed-path symlink rejection, explicit confirmation, in-memory
interface behavior, and rollback. The session test covers sidecar manifest
selection, token expiry and one-time use, checksum binding, multi-package
manifest disambiguation, path-free responses, execution snapshots, bounded
snapshot retention, and Runtime Registry commit.
