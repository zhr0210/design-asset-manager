# Design Asset Manager Eagle Companion

Version 0.2.0 is an installable, reviewable Eagle background-service plugin.
Normal DAM builds include `DAM-Eagle-Companion-0.2.0.eagleplugin`; download it
from the Eagle connected-library page and open it in Eagle to install. This
local package has not been published to or reviewed by the Eagle marketplace.

Choose the intended library in Eagle. In DAM choose read-only or editable,
request pairing, then explicitly allow that library in the plugin window.
The request expires after two minutes. Tokens are generated/transferred by
the applications, never copied by a user or displayed in either interface.
Main stores accepted credentials with Electron safeStorage. The plugin keeps
the session only in memory and stores only its non-secret installation ID.
Host restart can resume the still-running plugin; plugin exit, library change,
reinstallation or explicit revocation requires a fresh reviewed session.

The plugin observes the actual library directory's device, file identity and
creation timestamp. Main independently checks the same observation before
granting a stable local identity; a path or display name alone is insufficient.
Remote/virtual filesystems with zero or unstable identities fail closed.

The handler accepts only capability negotiation, item fingerprint, bounded
preview read, and `Item.replaceFile()` commands. Its authenticated gateway also
forwards only the exact Web API v2 info/get/update/add allowlist to Eagle's
fixed local port. Browser Origin/Fetch-Metadata requests are rejected; HTTP
binds only 127.0.0.1:41596. Add and Replace accept only the paired DAM staging
root; arbitrary URLs, paths and library-switch APIs are excluded.
It resolves items through the
official Eagle Plugin Item interface, never edits `metadata.json`, and rejects
unknown request fields, wrong sessions, library changes, symlink/path escapes,
and staged bytes whose digest differs from the reviewed request.

Metadata and Trash/Restore use Eagle Web API v2 (Eagle 4.0 build21+).
The Plugin Item documentation
does not expose Restore or permanent deletion, so this plugin does not invent
those operations. Installation, real pairing, and real Eagle writes remain
outside synthetic protocol validation. Cross-application compare-and-swap is
unavailable: DAM checks before/after, preserves unknown results and records conflicts.

Sources: [Web Item API](https://developer.eagle.cool/web-api/api/item),
[Plugin Library API](https://developer.eagle.cool/plugin-api/api/library),
[Plugin Item API](https://developer.eagle.cool/plugin-api/api/item),
[official packaging flow](https://developer.eagle.cool/plugin-api/publishing/package).
The ZIP packaging format was independently checked against installed Eagle's
`app/js/plugin/index.js` Pack Plugin implementation; no vendor code was copied.

License: MIT, matching the DAM project. Never include credentials, real library
files or local session state in a plugin package or report.
