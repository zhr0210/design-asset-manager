# Ownership and migration

| Old surface / field | Current owner | Consumer / boundary | Outcome |
|---|---|---|---|
| Settings/backend + oldConsole backend CRUD | AiWorkspace Connections / PiConnectionsPanel | aiBackend IPC + Gateway | single editor, IDs and revisions preserved |
| Pi task shortcut + oldConsole task choices | TaskModelSettings | settingsSave(aiTaskModels) | single task-default writer, no automatic inference |
| old template editor | task page legacy readonly records | public settings; current transport uses own recipe | data retained, no false effective-template claim |
| model storage | local models page | ModelLibraryWorkspace | original protected workspace reused |
| OCR environment | OcrEnvironmentSettings | assetOcr status/configure | explicit existing-environment selection; no install/model run |
| background plan and OCR | background page | existing controllers + Host | library session scope/qualification retained |
| engineering service acceptance | advanced diagnostics details | signed generated-only acceptance | finite budget/unknown protections retained |
| GPU clear/install/status polling | no default mount | disabled tombstones/core retained | unavailable controls retired; not re-enabled |
| Doctor/path maintenance | removed normal mount; About/current diagnostics links | disabled tombstones retained | no false effective repair action |
| libraryPath / collection prefs | Settings legacy disclosure | not Active Library/managed download control | values preserved, no claimed execution |
| build identity | About | trusted readonly compile identity | no private paths/account data |

Current source/build is separate from immutable historical reports. Native CU and real account are separate pending gates.
