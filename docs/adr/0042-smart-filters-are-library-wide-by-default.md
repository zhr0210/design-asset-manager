# Smart Filters Are Library-Wide by Default

Smart Filters should be library-wide by default instead of being owned by a
specific Asset Collection. When a reusable filter needs to target a specific
collection, Collection Membership should be part of the saved criteria.

This keeps the Smart Filters navigation section stable and prevents every
collection from creating its own parallel smart-filter namespace. It also keeps
Smart Filters true to their role as saved dynamic views rather than asset-owning
folders or collection-local shortcuts.

ADR 0445 Duplicate Text Value Finding follows this same library-wide default
while respecting any explicit Candidate/Design Asset, collection and lifecycle
criteria in the saved filter. It never expands into an implicit cross-library
uniqueness scan.
