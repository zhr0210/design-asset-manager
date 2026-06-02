# Runtime Package Source

Phase 10A adds a source model for runtime packages without adding a downloader or installer.

## Source Types

| Type | Access | Enabled | Network |
| --- | --- | --- | --- |
| `local` | Filesystem path metadata | Yes | Never |
| `bundled` | App resource metadata | Yes | Never |
| `remote` | Reserved remote metadata | No | Reserved only |

Remote sources are intentionally disabled in Phase 10A. They exist only so later downloader phases can use a typed shape without changing the source model again.

## Safety Boundaries

This phase does not:

- read package manifests from disk;
- fetch remote manifests;
- download runtime packages;
- verify checksums;
- extract archives;
- run package scripts;
- write the runtime registry.

## Next Step

Phase 10B should add a downloader interface and mock downloader with progress events. It must still avoid downloading real files.
