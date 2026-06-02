# Download Path Governance

Phase 14B adds a dry-run save-path planner for downloads.

The planner handles:

- Windows illegal filename characters
- duplicate filename strategy with an appended counter
- planned save path preview
- mock download task inputs only

It does not update the real download queue or write files.

Phase 14C handles thumbnail and normalized image path abstractions next.
