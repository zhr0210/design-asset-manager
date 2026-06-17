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

`release-signed-candidate-preflight.ts` records the shared signed-candidate
shape without reading secret values. It binds each platform to its GitHub
Environment, explicit `signing_approved` input, main-or-version-tag ref gate,
required secret names, path-free evidence files, Package Smoke, and
`publishEnabled: false`. The preflight test checks the workflow against that
shape so future maintenance does not accidentally weaken one platform while
changing the other.

`release-branding-preflight.ts` records the shared branding gate without
reading real icon assets. It requires `build/release-branding.json`,
`build/icon.ico`, and `build/icon.icns`, binds both platforms to the same
approval schema and evidence prefix, and keeps `defaultElectronIconAllowed:
false`. The evidence verifier still owns the real container and SHA-256
checks.

`release-readiness-summary.ts` combines the shared release-promotion state
machine with the signed-candidate and branding preflight shapes. It emits one
path-free readiness summary for Windows and macOS with the stage,
distribution/publish booleans, required evidence, approval gates, secret names,
branding approval file, platform icon name, and structured blockers. It does
not read secret values, icon bytes, candidate artifacts, or local paths.

`write-release-readiness-summary.mjs` turns the generated evidence files into a
retained release-readiness artifact. Its entrypoint is a thin wrapper around
the TypeScript writer, which reuses `release-readiness-summary.ts` and
`release-install-smoke-preflight.ts` instead of duplicating platform gates.
It reads checksum, update metadata, trust, branding, and Package Smoke reports,
derives the shared release gates, and writes
`release-readiness-summary-<platform>-<arch>.json`. Signed-candidate workflows
upload this summary next to the other release evidence. Static Package Smoke
alone satisfies the common Package Smoke gate; Windows Sandbox installer checks
or macOS DMG install checks are still required before the distribution gate can
pass.

`release-publish-approval.ts` validates an optional
`release-publish-approval.json` record for the final publish gate. The record
must match the platform and architecture, declare `distribution_ready`, and set
`publishApproved: true`. The readiness writer can consume it with
`--publish-approval=<path>` to mark a distribution-ready candidate as
`publish_ready`. This is still evidence only: it does not publish, mutate
GitHub settings, or read release secrets.

`release-external-gate-plan.ts` projects the remaining external release work
into one shared, display-only plan for Windows and macOS. It derives platform
environment names, workflow names, required secret names, branding files,
distribution smoke checks, and publish approval from
`release-environment-manifest.ts`. The plan does not write GitHub settings,
read secret values, read signing assets, read icon bytes, emit local paths,
execute workflows, or publish releases.

`release-signing-environment-status.ts` validates a manually supplied,
sanitized `release-signing-environment-evidence.json` record against the
shared release environment manifest. It checks only that the required GitHub
Environment names are represented, reviewer approval is configured, and the
required signing secret names are present. It never reads secret values,
signing assets, GitHub settings, or local paths, and it does not mutate
environments or run workflows. The companion
`write-release-signing-environment-status.mjs` writes
`release-signing-environment-status.json` for reviewers before triggering a
real signed candidate run.

`release-external-gate-status.ts` combines that plan with
`release-readiness-summary.ts` to produce a display-only gate status for each
platform and architecture. A gate is marked satisfied only when readiness
evidence proves it; otherwise it remains `external_action_required` or blocked
by an earlier candidate/distribution gate. The same artifact also includes a
shared cross-platform summary with aggregate counts, overall status, and the
next external actions. This keeps remaining human and platform-host work
visible without treating planned work as completed or requiring Windows and
macOS callers to interpret separate branch-specific gate rules.

`write-release-external-gate-status.mjs` turns the retained readiness summary
into `release-external-gate-status-<platform>-<arch>.json`. Signed-candidate
workflows upload this status next to the readiness summary so reviewers can see
which external gates remain after a candidate run. The writer reads only the
generated readiness summary; it does not read secrets, signing assets, icon
bytes, candidate binaries, local paths, or GitHub settings, and it does not
execute workflows or publish releases.

`release-evidence-bundle-status.ts` verifies a collected set of retained
`release-external-gate-status-*.json` files against an explicit
Windows/macOS platform and architecture requirement. The companion
`write-release-evidence-bundle-status.mjs` command can be run after signed
candidate artifacts are downloaded or collected into one directory. It emits a
path-free `release-evidence-bundle-status.json` with the target stage,
per-platform satisfaction, aggregate counts, and missing external actions. It
reads only generated JSON evidence files, not candidate binaries, signing
assets, icon bytes, GitHub settings, or secrets, and it does not trigger
workflows or publish releases.

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

## Validation

```bash
npm run test-release-readiness-summary
npm run test-release-readiness-writer
npm run test-release-publish-approval
npm run test-release-flow-governance
npm run test-release-signed-candidate-preflight
npm run test-release-branding-preflight
npm run test-release-signing-environment-status
npm run test-release-external-gate-plan
npm run test-release-external-gate-status
npm run test-release-external-gate-status-writer
npm run test-release-evidence-bundle-status
```
