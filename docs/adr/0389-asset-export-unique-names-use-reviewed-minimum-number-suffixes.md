# Asset Export Unique Names Use Reviewed Minimum Number Suffixes

ADR 0386's **Publish Asset Export With Unique Name** is an explicit conflict
choice, never an automatic property of ordinary Asset Export. Once selected,
the application proposes an **Asset Export Unique Name** by inserting the
smallest currently available parenthesized integer suffix beginning at 2. An
ordinary file uses `readable name (2).ext`, `readable name (3).ext`, and so on;
an Export Set Directory or dedicated asset directory uses `readable name (2)`,
`readable name (3)`, and so on.

Availability is evaluated against the live destination directory, every other
output and directory in the frozen Asset Export Plan, and every path currently
reserved by a still-valid attempt from that plan. Comparison uses the target
filesystem/provider's proven case, Unicode normalization and name-equivalence
semantics rather than application-locale string comparison. The allocator
tests candidates in ascending numeric order and reserves each reviewed result
in the frozen plan order so a batch produces deterministic, fully displayed
paths without two planned outputs selecting the same candidate.

The suffix is appended to the complete current readable stem and does not parse
or remove a pre-existing user-authored parenthesized number. A source named
`concept (2).psd` therefore keeps that stem and may become
`concept (2) (2).psd`; the application does not guess that an existing number
is disposable collision syntax. The user may edit any proposed ordinary output
or outer-directory name before confirmation, after which ADR 0385 Export Name
Normalization and the complete conflict scan run again.

For a single-file result, only the filename stem receives the suffix and the
truthful extension remains complete. For a Compound Original or other
multi-file result, only its dedicated outer asset directory receives the
suffix; member basenames and authoritative relative layout remain unchanged.
Copy Per Membership resolves each conflicting placement path independently,
while the review still aggregates every final name and additional physical copy
under the same Design Asset.

When the suffix would exceed a destination component/path budget, the allocator
shortens only the readable stem at an extended grapheme-cluster boundary until
the complete space, parentheses, integer and truthful extension fit. It retains
safe Unicode and never shortens or removes the integer/extension, transliterates
the stem, renames a Compound member, chooses another parent, or substitutes an
internal identifier. If the normalized `asset (n)` fallback cannot fit or no
candidate can be proven safe, the conflict remains blocking rather than
publishing an ambiguous or invalid path.

Default unique names never contain a timestamp, random token, database ID,
Design Asset Identity, storage-object identity, managed bucket label or Managed
Original Short Disambiguator. These values may remain internal plan tie-breakers
but are not user-visible filename material. This keeps exported names readable
without confusing a conflict copy with library storage or stable identity.

The complete unique-name allocation is visible before write and bound to the
confirmed destination snapshot. If the final path becomes occupied or its name
equivalence changes before publication, the placement returns to current Asset
Export Destination Conflict Review. It does not silently increment to the next
number, overwrite, skip, apply a remembered choice or treat its staging as the
new occupant. Original Asset Export still preserves exact source bytes; the
explicitly reviewed suffix changes only the external copy's name.

Batch naming templates/presets remain separate; result retention follows ADR 0392.
The current application has append-counter download behavior but no complete
Asset Export conflict/name planner implementing this contract. This ADR records
target architecture only and creates, reads, copies, renders, exports, stages,
writes, publishes, renames, moves, deletes or changes no runtime/user file,
credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.
