# Legacy Read-Only Workspace

This Module opens only a user-selected legacy DAM SQLite file through the same
macOS read-only opener used by Library inspection. It refuses an existing WAL,
SHM or rollback journal before SQLite opens, starts a read transaction with
`query_only`, and rechecks database/root nodes and sidecars during prepare,
confirmation and reads.

Its path-free Interface exposes summary, list, lexical search and controlled
preview bytes. It never calls `initDatabase`, schema initialization, legacy
migration, `setDatabase`, Active Library Host or any writer. Old content is not
automatically copied into Managed Library or Eagle.

Preview references are resolved only within a separately selected asset root.
Historical `~/` references use the explicitly selected tilde root. Preview
reads use `O_NOFOLLOW`, verify the opened file handle and selected roots, cap
bytes at 32 MiB, and accept only PNG, JPEG, GIF or WebP signatures.

Synthetic validation checks that database bytes/stat remain unchanged and no
WAL, SHM or rollback journal appears, including existing-sidecar and database
replacement failure cases.
