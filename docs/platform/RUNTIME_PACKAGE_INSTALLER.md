# Runtime Package Install Planner

This module remains the side-effect-free Runtime Package Install Plan builder.
It combines source, download, verification, extraction, registry metadata, and
rollback planning without performing a real install.

## State Machine

Installer state is represented by:

- `idle`
- `planned`
- `verifying`
- `extracting`
- `completed`
- `blocked`
- `rolled-back`

The state machine is pure and does not run processes or mutate files.

## Dry-run Install Plan

`MockRuntimePackageInstaller` creates a dry-run plan containing:

- download plan;
- verification result;
- extract plan;
- registry metadata plan;
- rollback plan;
- warnings and blocking issues.

Registry metadata is planning-only and has `writeRegistry: false`.

## Safety Boundaries

This phase does not:

- install Python;
- install CUDA;
- install models;
- write the runtime registry;
- write files;
- execute package scripts;
- start a real AI Worker.

## Executable Module

Executable local/bundled transactions live in the separate Runtime Package
Executor. Keeping planning and execution separate allows callers to inspect a
plan without granting file-system mutation.

See `docs/platform/RUNTIME_PACKAGE_EXECUTOR.md`.
