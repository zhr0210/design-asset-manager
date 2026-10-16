# Development issues: local records and scoped GitHub work

The local [development problem records](DEVELOPMENT-PROBLEMS.md) are the authority
for feedback from use, regression checks and diagnostics. Related records and
checks appear in `context:route`'s `feedback`; follow
[CONTRIBUTING](../../CONTRIBUTING.md#9-本地开发反馈闭环) to write results back.
Private or public GitHub Issues through `gh` remain available for a task that
explicitly references that tracker. This file is not permission to upload local
records, create issues, send comments, change labels or continue an old queue.

The latest user request controls priorities. An old issue number, ready label
or closed dependency does not authorize resuming superseded work. Read a
specific issue when the task refers to it; do not fetch every open issue by default.

## Commands

- Read: `gh issue view <number> --comments`; include labels when relevant.
- List a relevant subset: `gh issue list --state open --limit 20 --json number,title,labels`.
- Create: `gh issue create --title "..." --body-file <file>`.
- Update: `gh issue edit <number> --body-file <file>`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Label: `gh issue edit <number> --add-label "..." --remove-label "..."`.
- Close completed work: `gh issue close <number>`, with validation recorded.

Infer the repository from its Git remote. Use exact multiline UTF-8 content in
a temporary body file; avoid shell interpolation of issue text. Preserve fields
outside the authorized change. A skill's "publish to tracker" step uses this
convention only when that workflow is authorized; discussion or assessment alone
does not require remote mutation.

The user's requested deliverable determines completion. An analysis, plan or
prototype can be complete without publication or production implementation.
When publication is explicitly authorized for the target and scope, finish the
content and relevant checks, then publish without asking for the same approval
again. Otherwise deliver the requested result without making publication a
prerequisite. A skill's filing step never supplies missing authorization.

Label vocabulary: [triage labels](triage-labels.md).
