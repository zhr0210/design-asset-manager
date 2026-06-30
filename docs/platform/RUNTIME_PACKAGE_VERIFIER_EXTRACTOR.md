# Runtime Package Verifier / Extractor Planner

This document describes the side-effect-free verifier and extractor planning
module. It does not hash package files, extract archives, write files, or
execute package scripts.

## Verifier

`verifyMockDownloadedPackage` compares expected SHA-256 metadata with a caller-provided mock hash. This keeps checksum planning explicit without reading downloaded files.

## Extractor

`MockRuntimePackageExtractor` creates a dry-run extraction plan with:

- archive path;
- safe extract root;
- target directory;
- rollback plan;
- blocking issues.

The target directory must remain inside the extract root. Attempts to escape the extract root are blocked.

## Rollback Plan

`RuntimePackageRollbackPlan` records paths that a future installer would remove or restore and marks registry restore as required. It is planning metadata only in Phase 10C.

## Safety Boundaries

This phase does not:

- read package archives;
- write extracted files;
- execute package scripts;
- update the runtime registry;
- install Python, CUDA, or models.

## Executable Module

Real SHA-256 hashing and safe ZIP extraction live inside the separate Runtime
Package Executor transaction. The planner remains available for Dry Run UI and
preflight reporting.

See `docs/platform/RUNTIME_PACKAGE_EXECUTOR.md`.
