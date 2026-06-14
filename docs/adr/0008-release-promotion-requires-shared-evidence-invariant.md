# Release Promotion Requires a Shared Evidence Invariant

Windows and macOS release candidates use one promotion state machine:
`blocked`, `candidate_ready`, `distribution_ready`, and `publish_ready`.
Platform-specific trust evidence stays in platform gates: Authenticode and
Sandbox install validation on Windows; Developer ID, Hardened Runtime, nested
signatures, notarization, staple, Gatekeeper, and DMG validation on macOS.

Unsigned artifacts may be retained as candidates after build, governance,
checksum, and Package Smoke pass. They must never be treated as distributable
or publishable. Publishing additionally requires valid update metadata and a
separate explicit approval. This keeps the release architecture shared while
preserving real operating-system trust differences.
