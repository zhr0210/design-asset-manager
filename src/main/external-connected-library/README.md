# External Connected Library

Main-owned deep Module for one Eagle-connected Library. Eagle remains the sole
Original authority. This Module owns only a separate app-data SQLite index,
three-way metadata baselines, durable Journal/Outbox, conflict decisions,
rebuildable preview cache and quota-bounded edit staging.

## Interface and Adapters

Callers use `ExternalConnectedLibrary`: inspect, reviewed connection, one-page
indexing, list/search, queue changes, synchronize, resolve conflicts, read a
controlled preview and drain/close. Provider paths, ports, token, SQLite and
staging paths remain inside Main.

`EagleProviderPort` is the true-external seam. `createEagleWebApiAdapter()` is
the production protocol Adapter and tests supply synthetic protocol or
in-process Adapters. Web API v2 provides metadata and `isDeleted` Trash/Restore.
The companion Plugin handler provides item fingerprint, bounded preview read
and `Item.replaceFile()` only. It rejects arbitrary paths, extra fields,
unknown sessions and Eagle Library changes. Its own writes are serialized and
recheck the paired session after awaited reads; this does not lock other Eagle
clients.

Item lookup reports `found`, authoritatively observed `missing`, or
`unavailable`. HTTP errors, timeouts and malformed responses never become
deletion evidence. A completed page scan rechecks absent item IDs before it
creates tombstones, and pending Add items are excluded from missing-item
reconciliation.

Official Eagle Web/Plugin interfaces do not provide a conditional compare-and-
swap transaction. Every write therefore checks a baseline first and reads the
result back. An uncertain destructive result remains pending or conflict; a
local SQLite lock is never described as an Eagle-wide lock.

## Ownership and lifecycle

- Connected items never enter Managed Capture Candidate/Promotion or
  `managedOriginals`.
- Leaving a folder scope becomes `out-of-scope`, never Trash.
- A missing Eagle item becomes a durable tombstone and is not recreated.
- Main entrypoints are serialized. Close stops accepting work and drains the
  active request before closing SQLite; index results recheck library,
  volume and local generation before commit.
- Pending or conflicted staging is retained when quota is full or shutdown
  begins. Confirmed file replacement releases only DAM-owned staging.
- New Assets use an exact caller-generated Eagle item ID. A lost add response
  is reconciled by that ID plus content fingerprint before staging is released;
  filename or same-looking bytes elsewhere never count as a receipt.
- Permanent cleanup remains unsupported for the production Eagle Adapter.
  Synthetic protocol tests alone exercise a fake cleanup capability.
- Production uses `eagle-pairing.ts`, a Main-owned encrypted pairing session.
  Unpaired startup does not probe Eagle. Explicit begin requests approval in
  the companion; the plugin binds that consent to a real directory identity,
  grant and staging root. Main independently verifies device/file identity.
  The actual v2 requests are gated and forwarded by the companion; changing
  libraries or revoking the plugin cannot leave a direct Web API write bypass.
  Plugin sessions remain in memory; Main restart resumes the same running
  session, while plugin restart requires approval again. Disconnect revokes
  credentials without deleting index, journal, outbox or staging.
  A downgraded capability requires review before old writable grants dispatch.
- A Web API path is not a stable Library or volume identity. Without a trusted
  pairing resolver for provider, Library and volume identities, the Adapter
  negotiates metadata read/index only and reports every write capability as
  unavailable.

## Focused validation

```bash
npm run test-external-connected-library-core
npm run test-eagle-adapter-companion
npm run test-external-connected-library-ipc
npm run test-connected-library-background
npm run test-external-connected-library-electron-e2e
node scripts/run-ts-test.mjs scripts/eagle-production-pairing.test.ts
```
