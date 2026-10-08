# Deleted Assets Are Hidden Outside Trash Unless Included

Deleted Design Assets should be hidden from default Asset Grid, Asset
Collection, Smart Filter, and normal search surfaces so Delete Design Asset
feels effective. They should remain visible in Asset Trash and only appear in
search or filter results when the user explicitly enables Include Deleted.
Promoted Candidate Records, Candidate History, and Promotion Link surfaces may
show a Deleted Asset Placeholder so source traceability remains visible without
returning deleted assets to active library browsing.

ADR 0447 excludes deleted Design Asset Text occurrences from default duplicate
grouping and includes them only when the query explicitly enables Include
Deleted. Their inclusion remains advisory and does not restore the asset.

ADR 0478 keeps those deleted occurrences outside Missing initialization even
when Include Deleted makes them visible or selected. Asset Restore must first
return the Design Asset to current ownership, after which a newly reviewed plan
may include it.
