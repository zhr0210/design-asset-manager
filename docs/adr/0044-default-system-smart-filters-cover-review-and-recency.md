# Default System Smart Filters Cover Review and Recency

The default System Smart Filters should include suspected duplicates, tag
suggestions awaiting confirmation, candidates nearing expiration, and recent
captures. Suspected duplicates, pending tag suggestions, and expiration are
review-focused System Smart Filters with unresolved Review Signal semantics.
Recent Captures is an informational system-provided dynamic view with Match
Count semantics; recency is not unresolved work and does not create an
attention badge.

ADR 0413 removes Unsorted membership from default review work. Users can browse
the protected collection directly or explicitly save an ordinary User Smart
Filter for that scope, but the application does not create an Unfiled System
Smart Filter, unresolved signal or attention count merely because an asset has
no more specific collection.
