# Main Process

Electron main process for windows, IPC registration, local files, SQLite-backed services, and browser capture.

## Entry Files

- `index.ts`: app bootstrap and IPC setup.
- `ipc/`: IPC handlers.
- `services/`: business services.
- `db/`: SQLite connection and schema.
- `extensions/photoshow/`: bundled third-party browser helper assets; do not inspect `unpacked/` by default.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README and documented main-process ownership and extension boundary. |
