# Asset Search Is Hybrid Explainable And Complete Without Vectors

Asset Library search uses a local Hybrid Asset Search Plan rather than replacing keyword search with embeddings. Lexical Retrieval covers title/filename, user-authored metadata including text-searchable ADR 0415 Custom Field Values, confirmed ADR 0179 Tag Concept labels/aliases, OCR Source Text and its reversible normalization projection, and language-tagged descriptions. Semantic Retrieval may add text-to-image visual similarity, description/text similarity and ADR 0182 explicit Search By Image only through their exact declared Active Embedding Spaces and recipes. Web/source-site search remains a separate Capture Producer workflow and is not silently mixed into local-library results.

Every asset remains searchable without an embedding. Missing, waiting, stale, incompatible or intentionally disabled vectors remove only the affected semantic lane; lexical/filter results remain complete within their indexed evidence. Search never blocks while a vector is being generated, downloads a model, starts an external provider or uploads a query/asset. If no compatible local semantic lane exists, the UI reports Lexical Only rather than presenting semantic search as active.

Structured filters for collection, type, format, date, confirmed Tag Concept, ADR 0415 Custom Field Definition/value and other declared facets are hard candidate constraints. Exact filename/title and confirmed-tag matches remain first-class evidence and cannot be discarded merely because semantic similarity is low. The hybrid ranker combines independently ranked lanes through a versioned rank-fusion/calibration policy such as reciprocal-rank fusion; it never adds raw cosine distance, OCR text score and tag confidence as if they shared a scale. Different embedding spaces never compare or merge raw scores under ADR 0144. ADR 0404 applies a second Cross-Library Rank Fusion only to each library's resulting internal ranks, never to those incompatible raw lane scores.

ADR 0450 Text Custom Field operators remain structured hard constraints rather
than lexical relevance evidence. Their explicit comparison or portable-pattern
policy is evaluated before ranking and never inferred from lexical token
normalization, search language or embedding behavior.

ADR 0445 Duplicate Text Value Finding is a structured current-scope grouping
criterion, not lexical relevance evidence or a semantic lane. Its result does
not change search rank, infer field equivalence across libraries or create a
content Duplicate Signal.
ADR 0446 comparison keys are separate rebuildable filter projections; lexical
token normalization neither defines nor inherits their equality semantics.

Pending AI tag suggestions are excluded from ordinary exact filters, facets, counts and lexical ranking by default. The explicit **Include Pending Suggestions** search option may add uniquely mapped pending Tag Concepts and Unmapped raw suggestions as a clearly marked low-trust lane/filter scope. It does not confirm them, create concepts or make them indistinguishable from confirmed metadata. Ambiguous mapping candidates do not satisfy an exact concept filter; a dedicated pending-suggestion review query may expose them separately.

ADR 0419 Custom Field Value Suggestions are likewise excluded from ordinary
Custom Field filters, facets, counts and lexical ranking until accepted. Their
dedicated review query does not satisfy a current-value filter or make a
suggested value appear as user-authored metadata.

ADR 0420 archived Custom Field Definitions and their retained values are absent
from ordinary search-condition creation, facets and lexical retrieval. Restoring
the same definition identity may rebuild those projections; confirmed permanent
deletion removes them rather than leaving orphan searchable values.

Each result carries a bounded Search Match Explanation identifying contributing lanes and evidence types: filename/title, user metadata, confirmed tag, optional pending suggestion, OCR region/snippet, description language/source, visual similarity or example-image similarity. Explanations show relative/rank evidence and the exact embedding generation when relevant, not a fabricated universal percentage. They may reveal the user's own matched OCR/metadata only inside the local application and never enter system notifications, logs or external requests.

Query language follows evidence. Multilingual labels/aliases and OCR match their indexed language-aware forms. A semantic lane claims multilingual query support only when its exact text/image model and recipe have that evidence. Optional local query translation is a separately attributed derived query expansion and cannot replace the original query or pretend the embedding model is multilingual. Language Undetermined remains searchable lexically where normalization permits.

Index updates are generation-aware and atomic. Confirmed/manual metadata edits update lexical/concept indexes promptly; pending suggestions enter only the optional pending lane. OCR/description/result deletion and suppression remove their active searchable projections. ADR 0183 separates durable canonical vectors from rebuildable ANN index entries, both bound to owner, source/recipe generation, exact model space, dimensions, normalization and distance contract. Rebuild/migration follows ADR 0144/0145, can coexist with the old active space until cutover, and never leaves a mixed index.

Hybrid search degrades per lane. A corrupt lexical shard, missing vector index or stale result produces a typed partial-search state and repair action rather than empty success. Stable pagination/sorting binds one query-plan/index generation so background index updates do not duplicate or skip results mid-session; refresh may adopt newer evidence explicitly. ADR 0184 keeps ordinary history session-only and requires explicit Saved Search persistence.

An ADR 0451 Text Custom Field sort binds its exact field, direction,
Natural/Exact mode, language/tailoring and collation versions into that
query-plan generation. Search ranking supplies membership/evidence before this
explicit value order and never substitutes relevance, lexical-token order or
the current device locale as a hidden tie-breaker.

ADR 0452 Distinct Text Value Browser is a generation-bound structured-value
projection, not a lexical or semantic retrieval lane. Its entry-search text
narrows value groups locally under the selected field comparison mode and
cannot change asset relevance or become query history by implication.

Current implementation evidence belongs in
[implementation status](../agents/implementation-status.md) and the current search
callers. The removed external website SearchService is not an Asset Discovery path.
The current lexical baseline must not be described as a durable semantic/vector index.

ADR 0483 requires deliberate retrieval paths for all core analysis result kinds,
including persisted prompt reconstructions and measured palette proportions.
Text matches identify their field and suggestion/confirmation state; numeric color
constraints use measured structured values. Creative prompts do not become visual
facts, and session drafts/query history are not silently indexed. Unavailable analysis
is not a negative observation. These targets do not claim an implemented index or
change search APIs/schema merely through this decision.
