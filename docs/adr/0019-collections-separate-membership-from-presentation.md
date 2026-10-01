# Collections Separate Membership from Presentation

Asset Collections provide the underlying multi-membership organization model,
while Collection Groups and Collection Boards provide different presentations
of that model. Collection Groups support Eagle-like tree navigation and
hierarchical browsing; Collection Boards support Miro- or Framer-like visual
review for projects, moodboards, inspiration boards, and creative comparison.

ADR 0414 keeps those project-oriented boards and collection structures generic.
They present assets but do not create a core Project/Client record or project-
management lifecycle.

Neither presentation should duplicate Original Assets or replace Collection
Memberships. This keeps large-library management efficient while allowing the
Asset Workspace to feel more visual, spatial, and design-oriented when the user
is exploring or arranging references.

Folder Collection Mapping is an explicit import of organizational intent, not
a continuing presentation or filesystem synchronization mode. Its preview lets
the user choose source subtrees and mapping depth before proposing or creating
Collection Groups, Asset Collections, and Collection Memberships. ADR 0275 may
apply it to admitted Referenced Assets from a reviewed Source Tree, while ADR
0336 stores only candidate-bound Folder Collection Mapping Intents during Copy
Into Library and materializes the required organization at Candidate Promotion.
Once materialized, those objects are ordinary independent library organization
and no source rename, move, deletion, candidate-source change, or managed-
original relocation silently restructures them.

ADR 0384 allows an external Asset Export to project one explicitly selected
Collection Group or Asset Collection scope as destination directories. This is
a user-chosen output presentation only. It neither turns the exported
directory into a synchronized Collection tree nor changes, merges, removes, or
prioritizes the underlying multi-membership organization.
