# 更新：优先从 GitHub main 接续

此次将当前完整源码（含此前 WIP）统一至 main；以
[仓库整合记录](GITHUB-CONSOLIDATION-20261008.md)与 main 实际提交为准。
普通克隆/准备/启动命令见[REHOST最新段](../REHOST.md)。下文ZIP保留为
2026-10-08原字节离线快照，其 SOURCE-MANIFEST 仅用于该ZIP，不能套在克隆目录
或已重封印源码上。当前 Git 源码通过提交树与构建身份追溯，无需套ZIP验证器。
Mac缺口、已授权材料/服务范围和剩余验收不因这次整合而改变。

---

# macOS 接续开发入口（2026-10-08，上海时间）

本轮交付是当前源码快照、交接记录和剩余验收清单；没有在 Mac 上运行
应用、安装 Tailscale、迁移资料库或关闭产品任务。**WC01、T23/父#24、
D/E/F及商业首版整体仍未完成。** A/B/C已有各自Windows限定证据，
不能继承为macOS或当前全部产品验收。

## 先取得准确源码

当前Windows候选为 `dam-8ddc7686f890b3e3` / 786输入，版本1.0.0。
来源HEAD为 `156a9841e0262465d422283851095bca47979532`，分支
`codex/windows-workspace-1001`；实际工作树包含已采用的未提交实现。
仅克隆HEAD、历史公开分支或应用最后F补丁都会缺少当前代码。

使用本轮生成的 `DAM-macos-source-20261008.zip`，解压到**新目录**。
包内是经过路径范围核对的当前开发源码、文档和测试，不含Git历史、
平台依赖、模型、资料库、账号profile或凭据。`SOURCE-MANIFEST.json`
记录每文件原字节SHA、源码快照摘要、来源HEAD/暂存身份与产品输入覆盖；
Windows二进制/依赖头文件的未随包项明确标注。原始开发批次档案
`docs/handoff/development-history`保留在Windows；包内顶层交接和WC清单
保留其来源指针，敏感性不明的历史原始记录不随包。ZIP摘要在包旁
`TRANSFER-MANIFEST.json`。Windows原仓库和暂存保留，不需要reset/clean。

```sh
cd /实际的新目录/DAM-macos
node scripts/verify-candidate-source.mjs
node scripts/handoff-preflight.mjs
```

先验原字节，再安装/封印。preflight的环境缺失是正常待准备状态，不是
源码损坏，也不是应用通过。源码ZIP没有原Git历史；需要继承历史时从
Windows保留仓库取得经范围核对的Git基线，再按清单叠加当前工作树。
不要把新建根提交冒充原项目历史，也不要只拷贝一个阶段补丁。

## 平台准备与普通入口

在Mac核对 `uname -m`、可用RAM和磁盘、Node/npm及实际锁文件。
目标平台重新安装依赖，SQLite使用目标Electron ABI；不复制Windows
的node_modules、venv、DLL、CUDA或safeStorage保险库。

```sh
npm ci
npm run typecheck
node -p "process.platform + '-' + process.arch"
node scripts/prepare-pi-runtime.mjs
# 默认列当前目标的离线计划：darwin-arm64或darwin-x64。
node scripts/prepare-pi-runtime.mjs --approved
npm run build
npm run start:browser -- "--profile=/实际绝对路径/DAM-public-macos-profile"
npm run start:desktop -- "--profile=/实际绝对路径/DAM-public-macos-profile"
```

Pi准备从固定官方Node/锁定npm依赖重建目标资源，并生成新seal/Main
绑定；不能手填Windows摘要通过。账号由用户在目标应用正规入口登录。
Mac源码/资源变化产生新的候选和证据，Windows历史结果保留原身份。
当前prepare脚本、依赖/许可与资源准备已属于后续获批实施的必要工作；
本轮只生成交接包，没有执行上述安装、登录或推理。

正式源码快照不自带 `.git`；需要Git工具/context检查时先恢复正确的
Git基线和明确文件范围。源码完整性检查不依赖Git，不能用无tracked
文件的空仓将ownership 0/0冒称全候选治理通过。

## 已确认的Mac代码缺口

| 路径 | 当前源码事实 | 接续完成条件 |
| --- | --- | --- |
| GGUF Native运行包 | `managed-gguf-packages.ts`只准win32-x64，固定CPU/CUDA包 | 增加目标Mac固定来源/许可/哈希/架构、真实加载与退出，再接原库存/消费者；不是拷Windowsexe |
| 设备联动 | `device-sampler.ts`非Windows返回空GPU列表 | Apple Silicon按统一内存与Metal实际能力预算；Intel按实际设备；未知保持未知，避免RAM/VRAM双计 |
| 视频/参考帧 | Main接`createWindowsVideoRuntime`；执行只支持Windows x64 | Mac实际解码/抽帧Adapter、包内工具、取消/物理退出；保留父视频、时间位置与独立帧 |
| OCR/Python/检索 | 有跨平台入口和环境绑定；无本轮Mac资格 | 在Mac准备并真实验证RapidOCR、SigLIP2及中英文/图像输入，保留离线/空间身份 |
| Eagle | 正式接线代码存在，用户要求Mac开发测试；尚无真实Eagle结果 | 新建专用公开库、应用内配对、读取/写入回读、冲突、断连重配、恢复与重开 |
| Native/发行 | Browser共享界面不能替代原生 | 窗口/多屏/文件交接、凭据生命周期、实际安装升级卸载保库分别验收 |

保持已有Governor、Runtime自有allocator、执行冻结、用户编辑优先、
完整输入/输出标准和一次有审计本地OOM恢复。模型目录/下载继续走
ModelScope境内源，不能恢复HF fallback。参考宽松许可实现，保留来源。

## 任务与证据怎么接续

逐项未完成条件在[剩余验收清单](MACOS-REMAINING-ACCEPTANCE-20261008.md)，
包括WC01的H01–H22/C01–C03/UX、T23及A–F映射。清单是待办事实，
不是本轮自动实施或发布授权。后续用户指定继续Mac迁移时，建议：

1. 原字节源码核验、目标依赖/Pi、新候选普通双端启动。
2. Mac本地模型/OCR/资源与检索接线及真实保存重开；原有可用能力保持。
3. 专用公开Eagle库闭环，再集中Native工作窗口/跨应用交接。
4. WC完整交互/视觉/恢复补验与T23联合范围核对。
5. F双平台安装、升级、卸载保库和性能；签名/发布另按明确范围处理。

已有指定资料：公开图与其衍生副本、Blender官方开放许可短片，Eagle
专用公开库；新隐私素材不属于当前测试范围。`.scratch`原始库、模型和
profile仍在Windows，未随源码迁移。下一台设备准备真实库副本时核对
来源/许可、关闭或SQLite一致性备份、原件SHA及独立Host，不共享写同一DB。

原始WC/A–F证据仍在Windows各批次scratch；包内保留顶层报告及F安全
摘要/候选清单，不包含账号日志、会话授权、请求文件或完整运行DB。
随包回执入口：[Windows F回执](macos-transfer-receipts-20261008/README.md)。
无法在Mac取得原始证据的项应写“历史报告可追溯，原始本地证据待取”，
不能补造截图或把历史PASS标成Mac实测。

源Windows还有既有普通Host/profile可能保留草稿。PID和端口只用于
历史追溯，操作前重新核对身份，通过产品正常退出保护草稿；本轮没有
强杀、清理模型/资料库或更改既有会话。

权威入口：[AGENTS](../../AGENTS.md)、[产品基准](../product/PRODUCT-FOUNDATION.md)、
[架构](../../ARCHITECTURE.md)、[开发](../../CONTRIBUTING.md)、
[DESIGN](../../DESIGN.md)、[真实验收](../agents/ui-ux-acceptance.md)。
