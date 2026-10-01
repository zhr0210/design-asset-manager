# Candidate Promotion Uses Collection Targets

Candidate Promotion and Batch Promotion assign Collection Memberships as part
of promotion without requiring a manual filing decision. Before batch
confirmation, users may override the target Asset Collection for the whole
batch or selected candidates.

The default target order is: an explicit user-selected Asset Collection in the
current promotion review, then an ADR 0336 confirmed Folder Collection Mapping
Intent carried by that candidate, then a Collection Suggestion from the
candidate or Capture Batch, then the current workspace collection when the user
is clearly working inside one, and finally Unsorted Collection when no target
is known. A promotion-time override never rewrites the stored mapping for other
candidates. Promoted design assets must retain their Capture Batch source record
even when they are placed into another Asset Collection.

This preserves source context and explicit organization when desired while ADR
0413 keeps Unsorted fallback neutral, searchable and valid indefinitely rather
than turning promotion into a classification-completeness gate.
