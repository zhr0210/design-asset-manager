# Release Flow Governance

Phase 15C keeps the shared release-promotion invariant and adds an explicitly
approved signed-candidate path for Windows and macOS.

## Covered

- Windows NSIS target
- macOS dmg target
- x64 and arm64 matrix entries
- optional future macOS universal packaging
- SHA-256 artifact manifests
- shared `blocked` / `candidate_ready` / `distribution_ready` /
  `publish_ready` states
- 14-day unsigned candidate artifacts for manual inspection
- signed-candidate workflow behind GitHub Environment approval
- path-free Release Update Metadata
- structured Authenticode and macOS trust evidence
- macOS notarization and staple verification
- minimal Electron Hardened Runtime entitlements

## Disabled

- publish
- auto update
- signing or notarization without explicit workflow approval
- destructive cleanup

The workflow is manually triggered and builds unsigned Windows NSIS and macOS
DMG packages after typecheck, build, release-governance checks, checksum
generation, and static Package Smoke. It writes path-free checksum manifests
and uploads short-lived candidate artifacts. It does not publish, sign,
notarize, or read release secrets.

The separate `release-signed-candidate.yml` workflow requires both the
`signing_approved` dispatch input and approval for the platform signing
environment. It builds with `--signing=required`, verifies platform trust
evidence, writes Release Update Metadata, and uploads a retained signed
candidate. It still has read-only repository permissions and cannot publish.
It also verifies release branding evidence. Missing or malformed
`build/icon.ico` or `build/icon.icns` blocks the signed-candidate workflow
rather than allowing a default Electron icon to reach distribution gates.
The two icons must also match the SHA-256 values in the shared
`build/release-branding.json` approval record. The verifier parses the ICO and
ICNS containers and emits only path-free approval/check results; it does not
emit icon digests or local paths.

Unsigned artifacts can reach only `candidate_ready`. Windows distribution
requires Authenticode, Sandbox install smoke, approved release branding, and
update metadata. macOS
distribution requires Developer ID signing, Hardened Runtime, nested signature
validation, notarization, staple, Gatekeeper, DMG smoke, approved release
branding, and update metadata.
Publishing always requires a separate explicit approval.

Package Smoke now includes disposable install validation on both platforms:
Windows uses Windows Sandbox, while macOS mounts the DMG read-only, copies the
app into a temporary install root, launches with isolated app data, detaches,
and removes the temporary root.
