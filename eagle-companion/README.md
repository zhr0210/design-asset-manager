# Design Asset Manager Eagle Companion

This is an uninstalled, reviewable Eagle background-service plugin artifact.
It remains idle until a reviewed local session supplies a token, exact Eagle
Library identity, and one DAM-owned edit-staging root.

The handler accepts only capability negotiation, item fingerprint, bounded
preview read, and `Item.replaceFile()` commands. It resolves items through the
official Eagle Plugin Item interface, never edits `metadata.json`, and rejects
unknown request fields, wrong sessions, library changes, symlink/path escapes,
and staged bytes whose digest differs from the reviewed request.

Metadata and Trash/Restore use Eagle Web API v2. The Plugin Item documentation
does not expose Restore or permanent deletion, so this plugin does not invent
those operations. Installation, real pairing, and real Eagle writes remain
outside synthetic protocol validation.
