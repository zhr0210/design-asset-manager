# Path Governance Risk Register

This register captures migration risks discovered during Phase 7E. It is a planning document only. It does not authorize automatic migration, cleanup, repair, file movement, or database mutation.

| Risk ID | Risk description | Impacted modules | Trigger scenario | Windows risk | macOS risk | Data loss risk | Rollback difficulty | Blocking | Recommended phase | Avoidance strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PGR-001 | Asset rows store physical file paths that may be absolute, portable, or stale. | Asset library, UI previews, AI/OCR, palette extraction | Library root changes or app moves across machines | Drive/root mismatch, separator differences | Home-root changes, permission prompts | High | High | Yes | Phase 8B | Read compatibility first, dry-run inventory, backup DB, user confirmation |
| PGR-002 | Thumbnail and normalized image paths are generated from current library assumptions. | Normalization, thumbnail preview | New library layout or cross-platform move | Case-insensitive collisions | Case-sensitive/case-preserving mismatches | Medium | Medium | Yes | Phase 8C | Validate generated files before remap, never delete originals automatically |
| PGR-003 | AI task `file_path` snapshots may diverge from updated asset paths. | AI queue, prompt, analysis, tag sync | Asset path remap while tasks are queued/running | Stale task paths fail subprocess reads | Sandboxed access may fail | Medium | Medium | Yes | Phase 8D | Pause queue during migration, migrate only pending safe states |
| PGR-004 | Download task `save_path` may point outside governed roots. | Download queue | User changes download destination or imports old tasks | Invalid drive or missing parent | Missing permissions or moved folders | Medium | Medium | Yes | Phase 8E | Dry-run pending tasks, preserve completed history, no automatic file move |
| PGR-005 | Settings roots mix user-configurable roots with app-managed roots. | Settings, platform resolver, Doctor | Existing settings were created before managed path defaults | Host-specific defaults | Host-specific defaults | Medium | Low | Yes | Phase 8A | Separate user roots from managed roots and document precedence |
| PGR-006 | Model root and selected model path may include large external caches. | AI models, runtime installer | User moves model root or switches machine | Drive capacity, long paths | Permission prompts, symlinks | High | High | Yes | Phase 8F | Never migrate model weights automatically; offer remap and verification only |
| PGR-007 | Runtime/package paths may overlap with model roots or managed runtime metadata. | Runtime package planner, bootstrap, AI runtime | Runtime installer evolves from metadata to real package management | Locked files, antivirus interference | quarantine/signing concerns | Medium | Medium | Yes | Phase 8F | Separate metadata roots from real package roots; verify before write |
| PGR-008 | Symlinks and junctions can make inside-root checks misleading. | Filesystem guard, migrations | User library/model root contains link-based layout | Junctions cross drives | Symlinks cross volumes | High | High | Yes | Phase 8A | Resolve and record link policy before any migration |
| PGR-009 | Unicode, spaces, and illegal characters can break generated filenames. | Normalization, downloads, model package extraction | Imported file names contain special characters | Reserved device names and illegal chars | Unicode normalization differences | Medium | Low | Yes | Phase 8A | Use explicit sanitize policy and preserve display names separately |
| PGR-010 | Existing dynamic DB migrations already backfill path fields. | Database bootstrap | Future migration touches same fields without staged plan | Silent rewrite risk | Silent rewrite risk | High | High | Yes | Phase 8B | Add migration ADR before schema changes; backup before any field update |

## Blocking Principles

- No automatic migration of asset files, user files, model weights, download outputs, or existing settings.
- No deletion or movement of user-owned files as part of path governance.
- No database path rewrite without dry-run, backup, rollback, and explicit user confirmation.
- Any future migration must support old absolute path compatibility reads before writes.
