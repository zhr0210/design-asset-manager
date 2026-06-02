# Runtime Package Installer Skeleton

Phase 10D adds an installer planning layer. It combines source, download, verification, extraction, registry metadata, and rollback planning without performing a real install.

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

## Next Step

Phase 11A should add manual external HTTP runtime health checks. It must require user-triggered access and must not automatically contact external inference endpoints.
