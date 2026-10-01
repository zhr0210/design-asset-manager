# Physical Reclaim Summaries Use Ephemeral Path-Free Volume Labels

The first logical line of an ADR 0260 Physical Reclaim Completion Summary identifies its physical volume after the completion outcome label and before target count and actual reclaimed bytes. When the stable opaque volume identity currently resolves to an available mounted volume, the renderer shows the operating system's current human-readable volume display name as plain text.

The display name is resolved only for the current usable Storage Management projection. It is not copied into the completion result, header member snapshot, database, filesystem, settings, Full Library Backup, export/merge/sync, Activity History, telemetry, publisher feedback or support logs. A rename may change a later projection's label but cannot change the opaque volume identity, aggregate membership, acknowledgement or result expiry.

If the volume is unavailable, unmounted, unnamed or cannot be safely resolved, the header uses a localized generic label such as **Unavailable Volume 1**. Ordinals are allocated deterministically from opaque volume identities for the current Storage Management surface session, remain stable within that session and are discarded when the session ends. They are presentation labels only and are never used for aggregation or acknowledgement.

The visible label never contains or derives a mount path, managed path, device node, hardware serial number, filesystem UUID, stable volume identifier, digest, hash or suffix of any such identifier. The underlying opaque stable-volume identity remains host-only and binds the exact volume, generation and ADR 0258 member-set digest. Label resolution failure therefore does not make an otherwise complete header unusable and never permits name-based merging.

Volume names are treated as untrusted display text: they are text-escaped, whitespace-bounded and never interpreted as markup, a path, command, URL or owner identity. The same path-free label is included in the accessible header description. It does not expose package identity or alter ADR 0260's fixed metric order.

The label creates no persistent alias, volume history, device inventory or cross-session ordinal. ADR 0263 appends session-only ordinals only when distinct currently represented available volumes expose the same normalized human-readable display name; it reveals no device evidence and leaves unique names unchanged.

The current project has no Physical Reclaim Completion Summary or volume-label projection. This ADR changes documentation only: it resolves/displays no real volume, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API.
