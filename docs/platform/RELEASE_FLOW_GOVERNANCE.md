# Release Flow Governance

Phase 15B adds a shared release-promotion invariant and retained unsigned
candidate artifacts for Windows and macOS.

## Covered

- Windows NSIS target
- macOS dmg target
- x64 and arm64 matrix entries
- optional future macOS universal packaging
- SHA-256 artifact manifests
- shared `blocked` / `candidate_ready` / `distribution_ready` /
  `publish_ready` states
- 14-day unsigned candidate artifacts for manual inspection
- code signing reserved
- notarization reserved
- release workflow skeleton

## Disabled

- publish
- auto update
- signing secrets
- notarization secrets
- destructive cleanup

The workflow is manually triggered and builds unsigned Windows NSIS and macOS
DMG packages after typecheck, build, release-governance checks, checksum
generation, and static Package Smoke. It writes path-free checksum manifests
and uploads short-lived candidate artifacts. It does not publish, sign,
notarize, or read release secrets.

Unsigned artifacts can reach only `candidate_ready`. Windows distribution
requires Authenticode, Sandbox install smoke, and update metadata. macOS
distribution requires Developer ID signing, Hardened Runtime, nested signature
validation, notarization, staple, Gatekeeper, DMG smoke, and update metadata.
Publishing always requires a separate explicit approval.
