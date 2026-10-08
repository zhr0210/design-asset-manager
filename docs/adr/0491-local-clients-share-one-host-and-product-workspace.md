# Local Clients Share One Host And Product Workspace

Status: Accepted (2026-10-02). The user confirmed the complete design after Q1–Q8 with “我觉得没问题”.
This records target architecture, not delivered capability; implementation and acceptance are still pending.

DAM's Desktop Asset Workspace and formal Browser Asset Workspace share the same React product
presentation and one Local DAM Host per explicit profile. Electron initially hosts that authority;
Desktop IPC and loopback-only Browser transport adapt to its single command, media and event boundaries.
Library locks, committed data, accounts, AI execution, native windows and shutdown remain Host-owned.

The alternative of two independent backends would split lifecycle and task state and compete for library
locks. A standalone Node Host would require replacing credential protection, native window services and
native-dependency deployment together. Retaining Electron for the first dual-client implementation keeps
those services while making the product UI independent of its transport.

Both launch entries connect to the same profile's Host. Closing a client detaches its view; explicit Exit
DAM reviews unsaved state across clients/windows and drains the Host. The shared in-product selector
supports local filesystem workflows without making paths, process execution or arbitrary IPC trusted
Browser inputs. Main workspace and work-window clients retain distinct roles, member scopes and revocable
grants. New transport/selection/identity contracts are explicit compatibility seams with synchronized callers.

Concurrent edits preserve drafts and disclose conflicts. Workspace Recovery Drafts remain device/profile
local and separate from committed asset content; recovery requires identity and save-baseline checks.
Browser business acceptance and native OS acceptance are separate evidence. Missing native tools remains
BLOCKED_UX_ACCEPTANCE, and transport tests cannot certify actual inference or restore disabled model features.

This extends ADR 0009/0486 to a formal local Browser client, without restoring retired website collection.
It preserves ADR 0485/0489's native reference-window and ownership boundaries. It does not approve real
library migration, model downloads, credential input, external inference uploads, release or publication.
Details and the confirmed interview choices are in [the dual-client design](../product/LOCAL-DUAL-CLIENT-DESIGN.md).
