# Duplicate Volume Display Names Use Session-Only Ordinals

When two or more distinct opaque physical-volume identities represented on the current Storage Management surface resolve through ADR 0262 to the same available human-readable display name, every member of that collision group receives a localized parenthesized ordinal, such as **Design Volume (1)** and **Design Volume (2)**. A name represented by only one distinct volume identity receives no suffix.

Collision comparison uses the text-escaped visible name after Unicode canonical normalization and leading/trailing whitespace normalization. Otherwise the operating system's display text remains unchanged; distinct case or other visibly distinct characters do not create a collision group. Multiple summary generations for the same opaque physical volume share one display label and one ordinal rather than being counted as different volumes.

Ordinals are assigned deterministically from the host-only opaque volume identities in the collision group. The visible number is not derived from, and exposes no substring, encoding, ordering hint, hash or checksum of, the underlying identifier. The ordinal has no meaning outside disambiguating currently visible equal names and never participates in aggregation, member-set identity or acknowledgement.

Once assigned, a volume's ordinal remains stable for the current Storage Management surface session. If a newly projected summary introduces the first same-name collision, all affected visible labels gain their assigned suffix once. If another card expires, is acknowledged or disappears, remaining labels keep their suffixes and are not renumbered or stripped until the session ends. A later session recomputes collision groups and ordinals from its own visible summaries.

ADR 0262 unavailable-volume labels already use their separate current-session ordinal namespace and do not join available-name collision groups. Both the visual label and accessible header description use the same disambiguated text.

The application does not use capacity, free space, filesystem type, internal/external class, connection bus, device model, hardware identifier, mount path or other device evidence to disambiguate equal names. The suffix mapping is renderer-session presentation state only and creates no stored alias, preference, volume history, database row, backup/export/sync field, Activity History, telemetry or support payload.

The current project has no Physical Reclaim Completion Summary or duplicate-volume label resolver. This ADR changes documentation only: it compares/displays no real volume name, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0264 uses a disambiguated label only as a completion-time tie-breaker and never infers primary card order from these ordinals.
