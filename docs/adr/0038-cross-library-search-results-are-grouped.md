# Global Search Results Are Grouped By Library Object Type

Search Palette searches **Searchable Library Objects** and groups results by
their object type: Design Assets, Asset Candidates, Asset Collections, Tags,
Asset Sources, and Smart Filters including Saved Searches. Current-Library
Global Search applies those groups to the active library; Cross-Library Search
federates the same groups across eligible Registered Libraries and visibly
preserves each result's library identity and availability. Each Search Result
Group should show a small set of high-relevance results by default, with a way
to expand or drill into the full group when needed.

Object type is the default top-level organization. Every row keeps a visible
library and availability badge. Users can filter to selected Registered
Libraries or explicitly change the presentation to group by library, but
library-first grouping is not the default and neither operation activates a
library. ADR 0404 owns Cross-Library Rank Fusion and its prohibition on comparing
incompatible raw scores.

Within one content-bearing Search Result Group, independently owned objects
with verified byte-identical current Source Content Generations may fold into
one **Exact-Content Result Cluster** to prevent repeated identical rows. The
cluster visibly reports its occurrence count and represented Registered
Libraries, expands to every independent result, and requires a concrete
occurrence before an original, edit, metadata, navigation, or handoff action.
Each occurrence keeps its own object identity, library instance, tags,
collections, source, lifecycle, availability, rank evidence, and action state.
Copies that share Portable Library Lineage Identity remain distinct Local
Library Instances and are not treated as synchronized.

Clustering is presentation only, can be disabled to show every occurrence, and
creates no durable object, shared metadata, Duplicate Signal decision, merge,
deletion, or preferred copy. Filename equality, visual similarity, perceptual
hash proximity, ordinary Duplicate Signal, or incomplete/stale content evidence
never qualifies. An offline occurrence always remains separate because its
catalog cannot prove current external bytes; only reconnection, current-content
verification, and an explicit search refresh can make it eligible. Cluster
membership freezes with the Ephemeral Search Session's participating snapshots
and changes only after explicit refresh.

Object visibility remains owned by its normal lifecycle rather than by search.
ADR 0069 hides deleted Design Assets unless Include Deleted is explicit, and
candidate results retain Candidate Identity and Candidate Review semantics
instead of becoming Design Assets. Import/analysis tasks, queue entries, error
records and maintenance state may contribute status or filters to their owning
object but are not independent Search Result Groups. Models, plugins, settings,
and application commands are outside library-object search.

Search results should be keyboard-first: arrow keys move selection, Space
opens or closes quick preview for an eligible asset result, and Enter closes
the palette and opens a Search Focus View appropriate to the result object and
its library state. Selection or inspection of a non-active-library result stays
read-only; an action requiring target-library activation follows ADR 0277. The
focus view is transient and retains the search result context; it does not
create a collection, Smart Filter, or durable search record.

An asset Search Focus View shows every Collection Membership. Reveal in
Collection changes navigation context only after the user selects the target
when more than one membership exists; search never invents a primary
collection. Leaving the focus view restores the prior collection, filters,
sort, scroll position, and selection.

The Search Focus View keeps the originating Ephemeral Search Session and lets
the user move backward or forward through the same asset Search Result Group.
Crossing a loaded boundary fetches the next stable page on demand rather than
loading the complete result set. Returning to Search Palette restores its
query, selected group, result position, and selected item. Background index or
metadata changes may expose Results Available to Refresh but never insert,
remove, or reorder the active comparison sequence; only explicit refresh
adopts a newer query-plan/index generation. Cross-library pagination binds the
participating library snapshots and rank-fusion policy version for that same
session so a late or refreshed library cannot silently reorder an active page
or alter an Exact-Content Result Cluster.

Command/Ctrl+Enter explicitly opens an eligible asset original under ADR
0405's device-local External Open Preference and operating-system fallback; it
does not create a second workspace context. Escape closes the palette without
changing the prior workspace state. A referenced original that is unavailable
routes the external-open action to relink recovery instead of failing silently.
This keeps global search fast without flattening unlike objects into one
confusing list or launching a heavyweight external application on ordinary
Enter.
