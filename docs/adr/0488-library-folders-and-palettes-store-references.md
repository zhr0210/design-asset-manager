# Library Folders And Palettes Store References

Status: Accepted (2026-09-19), under the authorized ordinary-folder/palette persistence work.

Ordinary folders and palette folders belong to the Active Library. Use a normalized hierarchy, asset
membership table and deduplicated HEX color table on its exclusively held control database. A folder is
not a source directory: adding assets only creates references, and removing members or deleting a leaf
folder never deletes assets or Originals. Assets may belong to multiple folders. Asset Trash hides a
member from active counts without deleting the relationship, so restore restores membership too.

The first confirmed organization write upgrades v1–v5 to v6 transactionally. Opening/reading does not
upgrade. The user is told that older applications cannot open v6; cancellation or failed writes leave
the prior schema intact. Existing notebooks, AI evidence, downloads and recovery keep v6 without downgrade.
A library-bound session token plus a whole-organization revision guards atomic commands. This may reject
concurrent edits to unrelated folders, a deliberate small-interface trade-off in this first implementation;
failed/conflicting writes retain the input and require refresh rather than silently overwriting.

Folder kinds cannot be mixed in one hierarchy. Cycles and depth greater than 20 are rejected. A parent
must be emptied of child folders before deletion; this avoids an implicit recursive deletion operation.
Colors are canonical six-digit sRGB HEX values, unique within a palette; repeated collection retains the
first stored source reference (including a missing source) and does not duplicate the swatch. Color ratios are not stored
as properties of a saved color because they depend on a particular image and measurement recipe.

The approved shared Gallery presentation remains in use. AI folder rules and work-window palette sharing
remain separate follow-up capabilities; saved tag filters are no longer presented as ordinary folders.
