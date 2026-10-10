# DAM 当前状态：A–D/F 当前 Mac 适用范围已收敛

开发环境及原迁移交付保持可用。当前 `codex/macos-migration` 基于main `6b86ef05e558229e2bd87998101ca5678bc228cc`完成本轮A–D/F适用范围；未推送/合main。Eagle `codex/eagle-integration` 8cf60c7由用户延期调整，不混入迁移分支。

最新适用结果、限制与下一步只看 [TASK](../../TASK.md) 和 [A–F记录](AF-MACOS-20261010.md)，历史结果按各构建保留，不自动关闭父#24/WC01/全平台/商业总门。

当前唯一普通Host：PID41994 / `http://127.0.0.1:65500` / `dam-175fb4d6af635d1d`，公开profile、T23公开库190资产。175观察1801.5秒/91样本、9新公开副本18效果保存；暂停、正常退出/物理退出、同包重开10018及无重发成立。旧48d观察中断未合格；不是持续推理压测。

准确普通候选启动（先复用或正规退出同profile已有Host）：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
".scratch/af-macos-20261010/package-page-fix-final/mac-arm64/Design Asset Manager.app/Contents/MacOS/Design Asset Manager" --dam-profile=/Users/meigong/Documents/DAM-public-macos-profile
```

包未签名，普通启动不代替安装/发行资格。端口动态；Host重启后由原生设置→高级维护→准备浏览器入口向IAB建立独立/launch会话，不复用旧凭据。

## 启动与身份

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# Browser-first 可用同一 profile，复用唯一 Host：
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

“资料库管理”打开 `/Users/meigong/Documents/DAM-T23-macos-library`，工作模式恢复 `T23 Mac 联合参考`。Codex IAB 新会话/Host 重启后，经桌面设置→高级维护→准备浏览器入口的本机 `/launch` 正规连接；端口动态，不能复用旧会话凭据。

| 身份 | 当前记录 |
| --- | --- |
| 源码目录/分支 | `/Users/meigong/Documents/design-asset-manager-macos` / `codex/macos-migration` |
| main 克隆基准 | `6b86ef05e558229e2bd87998101ca5678bc228cc`；同步远端前重新核对 |
| 产品实现检查点 | `c2e5646`；175候选包含本批行刷新/状态文案修复，之后检查点按Git记录 |
| 当前普通构建 | `dam-175fb4d6af635d1d`，790 输入，UTC2026-10-10T06:43:06.696Z；当前适用用户路径已复验，48d解码/未改动模块证据按原产物范围保留 |
| 平台 | M4 / arm64 / macOS 27.0 / 24 GiB 统一内存 |
| Node / Electron | Node 25.8.0、npm 11.11.0、Electron 30.5.1 |
| 本机原生依赖 | better-sqlite3 12.10.0（Electron ABI）、Sharp 0.34.5 |
| Pi | 0.99.1 / 固定 Node 24.21.0；真实 seal/Main 绑定保留 |
| Python 消费入口 | `.scratch/macos-migration-20261009/python`，3.12.11；正式应用已消费，不得当临时目录删除 |
| Python 依赖 | Torch 2.14.1、Transformers 4.57.6、NumPy 2.2.6、ONNXRuntime 1.23.2、RapidOCR 1.4.4；[精确锁定记录](../checkpoints/macos-migration-20261009/python-lock.txt) |
| 本地模型 | ModelScope 来源 Qwen3-VL 2B/4B Q4_K_M + Q8 投影、SigLIP2、RapidOCR；固定 b11429 Mac GGUF 运行包。8B 本机未验 |

## 当前可用结果与接续

175实际三图本地描述/OCR后台、20次人工描述保存、一键3/3保人工内容、2B CPU/Metal验证/停用退出、万条库重开/分页/查询及旧取消记录回读成立。91条正式索引阶段57–1028ms；这是阶段观测，不冒称完整交互P95或全部后台负载都达标。

48d的T23独立/基础分析、取消与整Host重开、189图片语义/以图、官方视频新帧/备注与Preview字节接收证据成立；175中T23人工字段、189覆盖与实际中英查询、视频帧/备注来源均已回读；全部选定持久签名、189向量/3任务及原件摘要保持。175新交付PNG被Preview正规打开，110537字节/SHA同已保存帧，未读取receipt。

原10000资产全部既有列与真实v1备份相同，无旧资产后台意图；10000Original/4.35GB逐份SHA相同。27MB真实v1/v12备份工程恢复/打开/预览/重开保持，UI恢复仍未验。只含3种公开内容，复制规模不等于质量样本量。

当前授权目标完成后停止。后台保持暂停，未满足完整条件的父级不关闭。延期项集中 [待测清单](DEFERRED-ACCEPTANCE.md)；不自动扩展。其他两份WIP保留，运行环境、模型和已授权资料不清理。历史入口在 [Mac历史索引](../history/handoff-snapshots/macos-20261009-20261010/README.md)，分支归属见 [BRANCHES](BRANCHES.md)。
