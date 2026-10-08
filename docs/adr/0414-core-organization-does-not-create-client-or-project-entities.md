# Core Organization Does Not Create Client Or Project Entities

Independent designers use widely different client, project, campaign, reference and personal-library structures. Design Asset Manager therefore keeps a **Generic Organization Model** instead of adding first-class Client or Project entities to the core domain.

Users represent those contexts through Collection Groups, multi-membership Asset Collections, tags, ratings, custom metadata and Smart Filters. A collection or group may be named after a client or project, but its name and hierarchy do not acquire hidden client/project identity, status, ownership, billing, permission, deadline, deliverable or workflow semantics.

The application does not require a Client → Project hierarchy, project assignment, client record or project lifecycle before admission, organization, search, Original Handoff or export. This preserves ADR 0413 Search-First Organization and keeps the product inside asset management and retrieval rather than expanding into CRM, project management or delivery tracking.

Plugins may contribute optional views, metadata fields, import/export adapters or workflows through the public extension contracts, but they cannot silently promote their records into core asset identity or reinterpret Collection Membership. Introducing a future first-class Client or Project model would require an explicit new architecture decision, migration and compatibility plan rather than inferring entities from existing names.
