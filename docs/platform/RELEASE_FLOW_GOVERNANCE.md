# Release Flow Governance

Phase 15A adds a Windows and macOS release packaging dry-run workflow.

## Covered

- Windows NSIS target
- macOS dmg target
- x64 and arm64 matrix entries
- optional future macOS universal packaging
- code signing reserved
- notarization reserved
- release workflow skeleton

## Disabled

- publish
- auto update
- signing secrets
- notarization secrets
- destructive cleanup

The workflow is manually triggered and builds unsigned Windows NSIS and macOS DMG packages after typecheck and build. It does not publish artifacts or read signing/notarization secrets.
