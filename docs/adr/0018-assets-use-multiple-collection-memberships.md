# Assets Use Multiple Collection Memberships

Design assets should support multiple Collection Memberships. Asset Collection
is the user-facing organization model for projects, inspiration boards, themes,
or working sets; it is separate from Asset Category, which remains a broad
visual classification, and separate from Tags, which remain semantic labels.

Under ADR 0414, “project” and “client project” here are user-authored working
contexts, not first-class Client or Project entities. Collection names and
hierarchy gain no hidden lifecycle, billing, permission or delivery semantics.

This follows the Eagle reference model where one reference can belong to
multiple working contexts without duplicating the original file. A packaging
reference, for example, can simultaneously belong to collections for a client
project, a food-brand board, and a typography study while keeping one Original
Asset, one analysis history, and many searchable tags.

ADR 0275 Source Tree remains provenance and non-mutating folder navigation, not
a Collection Membership source of truth. Folder Collection Mapping may create
memberships once from a reviewed source scope, but later source moves do not
remove or rewrite the asset's independent multi-collection organization.
ADR 0281 Managed Originals Directory is likewise a physical ownership boundary,
not a Collection tree; assigning or removing memberships never moves, renames,
or duplicates its one library-owned original.

ADR 0384 may explicitly project one selected collection scope into an external
Asset Export layout, but that projection never establishes a primary
membership. When an exported asset has several selected memberships, export
must either receive an explicit single placement or an explicit instruction to
create a physical copy per membership; it does not infer priority from tree
position, membership age, current navigation, or source location.
