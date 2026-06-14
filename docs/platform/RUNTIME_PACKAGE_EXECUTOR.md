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
- rollback when registry commit fails.

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

## Validation

```bash
npm run test-runtime-package-executor
npm run test-runtime-registry
npm run typecheck
npm run build
```

The focused test generates ZIP fixtures at runtime and covers success,
duplicate install, checksum mismatch, traversal rejection, remote/model
blocking, managed-path symlink rejection, explicit confirmation, in-memory
interface behavior, and rollback.
