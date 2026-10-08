# Path Migration Requires Dry Run And User Confirmation

Stored asset, media, download, model, and runtime paths may be absolute, portable, stale, or host-specific across Windows and macOS. Any future path rewrite must therefore preserve legacy reads and require dry-run reporting, backup, rollback planning, and explicit user confirmation before mutation, trading migration speed for data-loss avoidance. ADR 0167 applies these principles through a separate model-root identity, digest verification, journal, atomic registry switch and second-confirmation old-copy cleanup workflow rather than reusing the database/media path executor blindly.

ADR 0276 distinguishes these Material Library Migrations from metadata-only
schema upgrades. A proven metadata-only upgrade may run after a verified
Pre-Migration Recovery Snapshot inside a validated transaction, but no code may
relabel a path, ownership boundary, referenced source, or Library Control
Directory change as an ordinary schema migration to bypass this ADR's dry run
and confirmation.
