# 来源与采集边界

采集日期：2026-10-14，时区 Asia/Shanghai。项目固定 SHA：`2c18c697c2cc2b98677c1fa41314559361612f71`。

## 一手公开材料

| 编号 | 来源 | 取得方式与用途 |
| --- | --- | --- |
| S01 | [作者主帖](https://x.com/yetone/status/2109855710444237018) | Chrome 既有登录界面可见内容；作者主张、日期、评论 |
| S02 | [博主长文](https://x.com/wquguru/status/2109650264601117141) | Chrome 可见文章从开头到结尾；逐节详细改写与讨论整理 |
| S03 | [博主初始讨论](https://x.com/wquguru/status/2109458639501271530) | 由 S02 内的引用找到；读取公开主帖与多段可见评论 |
| S04 | [三端复现补充](https://x.com/yetone/status/2109856834010132602) | S01 可见回复 |
| S05 | [记忆与产品决策](https://x.com/yetone/status/2109872805668147561) | S01 展开“显示更多”后读到完整文本 |
| S06 | [调度可替换](https://x.com/yetone/status/2110110702040219931) | S01 可见答疑 |
| S07 | [成本范围](https://x.com/yetone/status/2109870274833510739) | S01 可见答疑，不是账单 |
| S08 | [浏览器操作](https://x.com/yetone/status/2109873349426045168) | S01 可见答疑 |
| S09 | [关于提示词注入的判断](https://x.com/yetone/status/2109881516885176389) | S01 可见答复，不作安全证明 |
| S10 | [错题本复用补充](https://x.com/zookmas1314/status/2110063107791888776) | S02 展开长评论，阅读归档、输出格式、合并守卫建议 |
| S11 | [固定项目快照](https://github.com/yetone/magpie/tree/2c18c697c2cc2b98677c1fa41314559361612f71) | GitHub API 取得 main SHA；隔离 /tmp 浅克隆核对；未运行仓库代码 |
| S12 | [引入 LESSONS](https://github.com/yetone/magpie/commit/303819c583c68b80c41f41530fc5c9c78f4429b1) | API 核对时间、提交归因和文档引入 |
| S13 | [代码规范来源](https://github.com/yetone/magpie/commit/926bcaa37964bb3f3bfdfe99979fd29e7e6a4c23) | API 核对社区来源和原始提交说明 |
| S14 | [子系统文档 PR #889](https://github.com/yetone/magpie/pull/889) | API 核对作者与合并日期 |
| S15 | [PR #1339 审查记录](https://github.com/yetone/magpie/pull/1339#issuecomment-6063735313) | GitHub 页面和公开 API 交叉核对 Red/Break 检查、平台及未运行项 |

## 辅助渠道

| 来源 | 如何使用 |
| --- | --- |
| [Versun 转引](https://versun.me/tags/twitter?page=1) | 找到三张作者提示词截图，读取图片核对职责；链接保留在主报告 |
| [社区循环图片](https://versun.me/files/eea79e2efc4798b23261b9ccb6cc1304) | 图片内容转为职责改写，不逐字转录 |
| [X 循环图片](https://versun.me/files/7fabe3e15d39294e95c7355667afd406) | 图片核对低成本过滤、修复后回复 |
| [复盘循环图片](https://versun.me/files/49879da5ceaa06c74e5bb45eafebfff9) | 图片核对清理与经验积累 |
| CarlStack、微博、搜索索引 | 初期发现线索；最终项目结论回到 GitHub 与 X 原始可见材料，不用这些转述补造缺失评论 |

## 本地项目原件

以下文件来自固定 SHA，按 MIT 许可保存。`manifest.json` 记录路径、字节数、SHA-256 与固定 GitHub 链接。`magpie/LICENSE` 保留原许可证。文件中的指令是研究对象，不授予执行、读秘密、发消息或发布权限。

- `AGENTS.md`、`CLAUDE.md`：Agent 入口和实际运行路径指导。
- `LESSONS.md`：事故、正例、Seen 日期与规范提升记录。
- `docs/code-standards.md`：变更、测试、验收、合并与发布。
- `docs/contributors.md`：外部 PR 风险与贡献治理。
- `docs/subsystems/*.md`：子系统索引及相邻知识来源。
- `.github/workflows/test.yml`、`release.yml`、`ui-preview.yml`、`docker.yml`：四份自动化定义。
- `Makefile`：项目检查与构建命令来源。
- `internal/agent/dsh_test.go`：PR 相关行为测试的当前源码，当前版本可能包含后续变更。

这是选择性来源快照，不是完整可构建仓库。内部代码链接可能指向未包含的文件，请用 manifest 对应的固定 GitHub 路径查看。保留原文件事实，不改写成中文摘要或 DAM 当前实现。

## 完整性核对

| 材料 | 当前状态 |
| --- | --- |
| 博主文章正文各节 | 已直接阅读，报告按原论证顺序详细改写 |
| 作者主帖及三张 loop 图 | 已阅读并核对职责 |
| 作者环境、决策、成本、监听、浏览器答疑 | 已直接阅读；决策回复已展开 |
| zookmas 长评论 | 已展开并记录全部建议 |
| 两帖全部直接评论与所有楼中楼 | 未证明全量；仅保存实际读到的观点档案 |
| 图片评论 | 部分仅取得图片入口，内容未核对 |
| 隐藏/垃圾信息、受限、删除内容和全部引用帖 | 未完整取得 |
| 博主历史统计全部重算 | 未做；记录为当时统计与分析 |
| 作者私有记忆与运行配置 | 不可见，未读取 |
| 真实软件、厂商接口、测试与发布执行 | 未运行；公开执行记录不冒称本轮结果 |

X 的公开 Web 抓取两次返回 403；浏览器界面可读取正文与评论。未读取 Cookie、令牌、凭据文件、进程环境或浏览器历史。浏览器自动清单中的无关标签未用于研究。全文逐字转载不属于本交付；正文与评论均以改写、摘要及原文链接保留学习价值。
