# Legacy Library interactions

This note records the read-only recovery page and its user-facing behavior.

## Legacy Read-Only Library

The page consistently labels the session **Read-only access** and gives a
three-step path:

1. choose a legacy Design Asset Manager `.db` or `.sqlite` file;
2. choose the corresponding asset folder;
3. review counts and confirm read-only opening.

Search and preview remain available after opening. An empty database, an empty
search result, and an unavailable preview use separate messages; none is shown
as successful content recovery. Closing removes the current read-only view.

## Shared interaction rules

- Existing IPC calls, receipts, grants, and `data-testid` values remain intact.
- Busy and error feedback appears in the section that owns the next action.
- Actions disable while one request is active, preventing duplicate submission.
- UI colors come from the shared workspace variables through
  `WorkspacePrimitives`; these pages do not define theme colors.

