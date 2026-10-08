# Connected and Legacy Library interactions

This note records the user-facing behavior of the two secondary library pages.
It does not change provider, storage, IPC, or ownership contracts.

## Eagle Connected Library

The page follows three stable regions so content does not move when work appears:

1. **Connection status** states what is available and presents the next useful
   action: read the index, sync retained changes, or resolve a conflict.
2. **Needs attention** lists unresolved and held conflicts before the asset
   browser. Every card names the local and Eagle versions and retains the three
   existing choices. Holding is visible and does not imply a remote write.
3. **Asset browser** keeps search, explicit name saving, file replacement, and
   Trash/Restore actions together. Typing never writes; the user must choose
   **保存名称**. File replacement and Trash copy explain when Eagle changes.

An unpaired state says that real Eagle access is not enabled and lists the
pairing prerequisites. The only presented scope is the whole library because
that is the current supported product flow. Synthetic evidence stays visibly
labelled. Technical operation identifiers and attempt counts live inside the
collapsed **Diagnostics** section of **Sync history**.

## Legacy Read-Only Library

The page consistently labels the session **Read-only access** and gives a
three-step path:

1. choose a legacy Design Asset Manager `.db` or `.sqlite` file;
2. choose the corresponding asset folder;
3. review counts and confirm read-only opening.

The copy explicitly distinguishes a legacy DAM database from an Eagle Library.
Search and preview remain available after opening. An empty database, an empty
search result, and an unavailable preview use separate messages; none is shown
as successful content recovery. Closing removes the current read-only view.

## Shared interaction rules

- Existing IPC calls, receipts, grants, and `data-testid` values remain intact.
- Busy and error feedback appears in the section that owns the next action.
- Actions disable while one request is active, preventing duplicate submission.
- UI colors come from the shared workspace variables through
  `WorkspacePrimitives`; these pages do not define theme colors.

## Existing synthetic E2E locator updates

All `data-testid`, `data-connected-item`, form labels, the legacy search
placeholder, conflict choices, cleanup text, and the Chinese missing-original
label remain available. Text-only action locators need these mappings:

- `排队名称` → `保存名称`
- `暂存文件编辑` → `选择替换文件`
- `排队回收` → `移到 Eagle 回收站`
- `排队恢复` → `从回收站恢复`

The exact connection-review sentence, `Eagle 离线`, `使用 Eagle`,
`确认永久清理`, `旧 DAM 库已只读打开`, and the legacy preview/search
locators are unchanged.
