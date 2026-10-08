# Boolean Defaults Are Explicit, Portable, And Future-Owner-Only

Under ADR 0474's shared Static Custom Field Default contract, a Boolean Custom
Field Definition may carry an optional **Boolean Custom Field Default** of True
or False. It is disabled by default, library-owned portable schema and never
inferred from a control, field name, prior values or device setting. Missing is
not offered as a default value because disabling the default already preserves
Missing without fabricating a Boolean.

The enabled default applies once, inside the authoritative creation transaction,
only when a new Candidate or a Design Asset created without Candidate Promotion
first becomes a Custom Field Value owner and no higher-priority explicit intent
exists for that field. A reviewed import mapping's explicit True, False or
explicit Missing intent wins. A Candidate Promotion transfers the Candidate's
exact current True, False or Missing state under ADR 0416 and never applies the
Design Asset default again. This makes an older Candidate that remained Missing
stay Missing after Promotion even if the default was enabled later.

Creating, enabling, disabling or changing the default never writes, fills,
clears or reclassifies an existing Candidate or Design Asset, including an
existing Missing owner. The definition surface states **Future New Owners
Only** before confirmation. Initializing current owners is a separate reviewed
batch edit with its own scope, preview, commit and operation-scoped Undo; schema
confirmation cannot disguise a backfill.

A creation/import review that can produce an owner shows whether the resulting
Boolean came from explicit input, imported mapping, transferred Candidate state
or the exact default definition revision. Definition/default drift invalidates
the reviewed creation plan rather than silently changing its outcome. Archived
definitions apply no defaults; restoration affects only later eligible owners.
A plugin/imported schema may include a default only inside an ADR 0418
Definition Proposal that the trusted host visibly validates and the user
accepts. AI and Analysis Result Providers cannot create, enable or change it.
