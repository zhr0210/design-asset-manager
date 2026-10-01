# Capture Cleanup History Shows Minimal Recovery Fields

Capture Cleanup History should show only the fields needed to understand and
act on recoverable cleaned candidates: thumbnail, source, Cleanup Reason,
cleanup time, Recoverable Until, and restore or Hard Delete actions.

This keeps cleanup history focused on recovery instead of becoming a broad
audit surface. Users can see why a candidate was cleaned, when the safety net
ends, and what action remains available without scanning unrelated metadata.
