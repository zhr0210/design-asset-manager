# Runtime Package Verifier / Extractor Skeleton

Phase 10C adds verifier and extractor contracts plus mock implementations. It does not hash package files, extract archives, write files, or execute package scripts.

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

## Next Step

Phase 10D should add an installer state machine and dry-run install plans that combine source, download, verification, extraction, registry metadata, and rollback planning.
