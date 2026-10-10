# DAM 当前可用状态

更新：2026-10-11文档整理；产品证据截至2026-10-10。本页只维护能力、启动、版本和限制。当前工作见 [TASK](../../TASK.md)，跨系列状态/剩余条件唯一入口为 [任务主台账](../tasks/TASK-REGISTRY.md)。

## 用户现在可用的范围

Mac本地优先素材工作区、普通Browser/Desktop共享Host、Copy/查询/人工编辑、适用2B模型标签/描述/OCR/一键分析、SigLIP2中英文/混合/以图、工作集/官方视频参考帧与独立PNG交付已有限定真实证据。T23公开库189图片图文覆盖/190词法；规模公开副本10018条、三批9新图18后台效果、1801.5秒观察、正规暂停/物理退出/同包重开及保护成立。

这些是固定平台/候选/素材范围的结果，不是全部模型、Provider、质量、规模、原生或发行资格。完整证据见 [Mac验收记录](../history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)。

## 普通入口

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# 或连接同一profile的唯一Host：
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

复现已验普通未签名候选：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
".scratch/af-macos-20261010/package-page-fix-final/mac-arm64/Design Asset Manager.app/Contents/MacOS/Design Asset Manager" --dam-profile=/Users/meigong/Documents/DAM-public-macos-profile
```

先复用或正常退出已有同profile Host，禁止两个Host写同一活动库。npm入口使用`--profile`，直接.app使用`--dam-profile`。源码改变后的开发产物不能借此候选的旧资格。

“资料库管理”选择 `/Users/meigong/Documents/DAM-T23-macos-library`；工作模式有`T23 Mac 联合参考`与官方视频工作集。规模库是独立公开测试副本。端口/PID随运行变化，本页不保存旧进程为当前事实；IAB首次或Host重启后，从原生设置→高级维护→准备浏览器入口，在内置浏览器打开应用当次给出的`/launch`地址，建立独立会话，不复制账号凭据。

## 身份与消费者

| 项目 | 记录（产品证据截至2026-10-10） |
| --- | --- |
| 源码/分支 | 唯一上述目录 / `codex/macos-migration`；产品修复`c2e5646`，验收提交`a1faf93`；文档整理另记Git提交 |
| main基准 | `6b86ef05e558229e2bd87998101ca5678bc228cc`；未声称本轮刷新远端/合入功能 |
| 受测普通包 | `dam-175fb4d6af635d1d`，790输入，构建UTC2026-10-10T06:43:06.696Z；完整SHA见验收记录 |
| 平台 | Apple M4 / arm64 / macOS27.0 / 24GiB统一内存 |
| Node/npm/Electron | 25.8.0 / 11.11.0 / 30.5.1 |
| 原生依赖 | better-sqlite3 12.10.0（Electron ABI）/ Sharp0.34.5 |
| Pi | 0.99.1 / 固定Node24.21.0，真实seal/Main绑定；不得用Windows分发物替代 |
| Python消费环境 | `.scratch/macos-migration-20261009/python`，3.12.11，正式应用已消费，不能作为临时缓存删除 |
| Python依赖 | Torch2.14.1、Transformers4.57.6、NumPy2.2.6、ONNXRuntime1.23.2、RapidOCR1.4.4；[精确锁](../checkpoints/macos-migration-20261009/python-lock.txt) |
| 模型/运行包 | ModelScope Qwen3-VL 2B/4B Q4_K_M+Q8投影、SigLIP2、RapidOCR；固定b11429 Mac GGUF；实际适用资格按主台账 |
| 分支隔离 | Eagle方向调整在`codex/eagle-integration`（隔离检查点8cf60c7），未混入迁移；[目录与分支](BRANCHES.md) |

## 实际限制

后台在验收终态暂停；启动后的现场状态以正式界面为准。4B Metal有资源拒绝记录，8B本机未验，OCR漏行/空格及模型徽章细节误读保留质量弱项。30分钟观察含空闲、规模图片只有3种内容；91条索引阶段57–1028ms不等于所有交互P95或持续推理压测。27MB旧schema工程副本恢复不等于用户UI恢复。

真实断网、Windows原页压力、外屏、完整原生交付、Eagle、完整窗口扩展和签名发行等状态只在主台账维护，不在本页再建待测表。窗口云上传/分享已取消；移动同步不是同一目标。Mac适用收敛不关闭WC01、A–F全平台、DualClient父#23、LocalAI父#24或商业父级，最新已核对main两平台CI仍失败；本轮未新验产品或远端状态。

## 按需接续

[模块接线入口](../agents/implementation-status.md) → 对应模块README；[任务主台账](../tasks/TASK-REGISTRY.md) → 相关原始证据；[历史索引](../history/task-consolidation-20261011/README.md)仅在需要因果/旧方案时读取。保留运行环境、资料、模型与其他WIP，不默认加载全部旧报告。
