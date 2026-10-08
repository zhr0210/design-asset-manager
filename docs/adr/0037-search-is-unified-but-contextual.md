# Search Is Unified but Contextual

Search should use a consistent interaction model while keeping embedded
workspace searches inside their current content boundary. Asset Grid search
should search confirmed design assets, Candidate Review Page search should
search asset candidates, and other workspace searches should respect their
active context.

A global shortcut should open ADR 0039 Search Palette in Cross-Library Search
with all Registered Libraries as its explicit default Search Scope. The same
palette can switch to Current-Library Global Search without clearing the query,
while Contextual Search remains embedded and unchanged. ADR 0277 keeps the
cross-library scope read-only while ADR 0038 searches the same user-visible
Searchable Library Object types without merging libraries or granting multiple
libraries simultaneous write ownership. This makes the global entry genuinely
global without making every toolbar search field cross product or library
boundaries unexpectedly.

ADR 0427 keeps a target Custom Field Definition searchable during its active
type migration, but evaluates only committed target values and visibly marks
the result scope as Partial Custom Field Migration Coverage. Search never
infers target matches from the separate source field.
