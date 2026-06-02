# Runtime Package Downloader Skeleton

Phase 10B adds downloader contracts and a mock downloader. It does not download real files.

## Added Shapes

- `RuntimePackageDownloader`
- `RuntimePackageDownloadPlan`
- `RuntimePackageDownloadProgress`
- `RuntimePackageDownloadStatus`
- `RuntimePackageChecksumPlan`
- `MockRuntimePackageDownloader`

## Mock Behavior

The mock downloader creates a dry-run plan and emits deterministic progress events:

1. `planned`
2. `progress`
3. `completed`

If the source is a reserved remote source, the destination path is missing, or checksum metadata is invalid, the mock emits `blocked`.

## Checksum Plan

The checksum plan records expected SHA-256 metadata and blocking issues. It does not hash files in Phase 10B because no file is downloaded or written.

## Safety Boundaries

This phase does not:

- fetch network resources;
- read package archives;
- write package files;
- extract archives;
- execute package scripts;
- update the runtime registry;
- install Python, CUDA, or models.

## Next Step

Phase 10C should add verifier and extractor interfaces, safe extract root rules, mock extractor behavior, and rollback planning without executing package scripts.
