# Asset Notebooks Use Versioned Library-Owned Storage

Status: Accepted (2026-09-17), under the authorized notebook save/restore work.

An Asset Notebook is a set of user annotation pages attached to one Design Asset and its controlled
preview reference. Store it in the same exclusively held Active Library control database as the asset,
independent of Original bytes. This keeps notebook writes transactional and recoverable with asset
identity; browser-local storage or unmanaged sidecar files would create a second ownership boundary.

The first explicitly confirmed save upgrades v1–v4 to v5 and adds the notebook table; reads/opening never
upgrade. The UI discloses that older application versions cannot open v5. A failed save rolls back both
schema and data changes. Notebook format version is independently recorded. Existing AI/download/recovery
readers accept v5 without downgrading it. Real third-party/Eagle migration is not authorized by this decision.

Every save is checked under the current held lease against library identity, generation, a fresh binding
session token, preview reference and notebook revision. Reopening the same persistent generation does not
revalidate old save tokens. Conflicts retain local drafts and require review; reconciliation appends changed
draft pages with fresh identities beside the latest committed version instead of silently overwriting it.

Asset Trash retains notebooks. Restore makes them editable again; trash-state saves are rejected. The
foreign-key restriction prevents silently dropping notebooks during a future hard-delete path. Permanent
purge, notebook export, AI indexing and automatic cloud synchronization remain separate decisions.
