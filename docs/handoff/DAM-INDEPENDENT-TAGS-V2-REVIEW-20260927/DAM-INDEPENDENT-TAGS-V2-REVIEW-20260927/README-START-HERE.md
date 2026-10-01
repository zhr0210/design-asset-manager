# DAM 独立标签首轮 v2 修订｜工程师确认包

2026-09-27。**本包用于评审确认，MODE=SPEC；待审、未实施、未发布。**

## 先读这些文件

1. [本轮收敛评审](revision-v2/READINESS-REVIEW.md)：问题分类、放行点与剩余缺口。
2. [当前契约补充](revision-v2/ACTIVE-CONTRACT-ADDENDUM.md)：身份、单写、共享准入、schema/回退及关闭边界。
3. [任务修订说明](revision-v2/PLAN-CHANGES.md)与[新版7任务计划](revision-v2/FIRST-ROUND-PLAN.v2.json)。
4. [测试放行矩阵](revision-v2/TEST-GATE-MATRIX.md)：参考模型与未来生产验收分开。
5. [显式替代索引](revision-v2/SUPERSEDES.json)及[延期事项](revision-v2/DEFERRED-REGISTER.json)。
6. [评审确认表](REVIEW-FORM.md)：记录结论，不默认勾选通过。
7. [下一步交接](revision-v2/HANDOFF.md)：唯一下一实施候选是任务01，仍须明确IMPLEMENT。

## 本轮实际交付

- 单写/current与切换drain、最小共享准入前移至任务03首次新写之前；保留原generation/session/claim/cancel防线。
- 任务02增加02A方案核实与02B持久意图实施检查点，区分旧二进制拒写与新版现有功能兼容。
- 身份语义及冲突条款有显式supersedes；7个父任务与依赖保持，01/07票字节未改。
- 2条历史参考模型反例已复现；8条最小修订规格示例通过；20项文档/输入/工作区检查通过。
- 原205案例与评审者205重放是同一套案例，不能记为410个独立测试。本包的8例也不是生产验收。

## 包的构成与限制

`revision-v2/` 是本次修订目录的字节副本，包含当前文档、7张草案、选定历史输入、独立纯规格检查和证据；`original-input/` 附带用户原始完整交接ZIP，原包保持不变。

修订副本中的inputs仅是选定输入，历史文件保留原链接，部分依赖不在选定子集内；请在原始完整ZIP的同名路径查阅。当前v2入口链接已单独核对。源码路径和摘要用于定位，**本包不包含真实应用源码、用户库、素材、模型或凭据**；完整仓库保护检查不能仅凭此包重现。

`revision-v2/checks/minimal-spec-checks.py` 是可在解包目录手动重放的标准库纯规格检查；打包时已在副本中重放，8例通过。它不运行生产Host/SQLite/模型。`verify-revision.py`依赖原仓库目录结构和原输入ZIP位置；缺少这些环境时不要把失败或未执行改成PASS。

`MANIFEST-SHA256.txt`列出包内全部载荷文件的SHA-256（不含清单自身）；ZIP外另有整包SHA-256。可先运行本包的`verify-package.py`做只读完整性检查，再阅读材料；脚本不运行任何业务或模型测试。

生产代码、真实临时SQLite、正式Electron、新模型、Windows、真实库迁移均NOT_RUN。原工作区未提交修改保留；本包不授予自动执行、发布、提交或模型/数据操作权限。
