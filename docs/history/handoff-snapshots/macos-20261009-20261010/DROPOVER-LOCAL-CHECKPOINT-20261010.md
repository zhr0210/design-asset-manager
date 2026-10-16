> 历史批次记录；当前状态以 [CURRENT-STATE](../../../handoff/CURRENT-STATE.md) 为准。旧候选、等待与资格保持原时间身份。

> 2026-10-14内容清理：停用的外部集成记录已删去，本页仅保留其余历史内容；原功能总数、摘要及验收结论不作为当前构建的统计或资格。

# Dropover 本地功能接续（2026-10-10）

用户要求功能整合进 DAM 工作浮窗，保留架构；明确不需要云上传/分享。完整本地功能清单仍未全部实施，不能关闭全部 T23/父级。原排除真实断网、Windows 原页压力、签名安装/商业发行保持；外屏仍无设备。

## 普通可用候选

代码 `179f29b`，分支 `codex/macos-migration`；构建 `dam-bd59d711e6a61838`，SHA `bd59d711e6a61838d57a0731a25c6f2ab896edff75215b620d0b1ac6b0300f9a`，789 输入，UTC 2026-10-09 15:53:49.347。未推送。后续 clipboard/open-existing 代码正在实施，尚未编入这个候选，不继承本候选资格。

启动：在 `/Users/meigong/Documents/design-asset-manager-macos` 执行 `npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile`。普通资料库管理打开 `/Users/meigong/Documents/DAM-T23-macos-library`，工作模式恢复窗口。Host 49929 正常退出后，51422/62018 同构建已普通重开。

2026-10-09 晚重新通过既有系统代理的单次 Git 只读查询核对 main：`6b86ef05e558229e2bd87998101ca5678bc228cc`。未改系统网络或 MCP 配置。archiver 7.0.1/MIT 从 dev 移到固定生产依赖，未运行依赖安装脚本；原目标 ABI 保持。Ghidra 12.1.4/Apache-2.0、OpenJDK 21.0.12.1 已通过官方 Homebrew core 安装，原独立 Python 3.12.11/arm64、Torch 2.14.1、ONNX 1.23.2、NumPy 2.2.6 导入再核对成立。未安装收费反编译器。

## 当前真实路径

- 前候选 `aa5a83…`：普通原生窗一次“准备全部拖出”实际生成三个不同公开副本；checkbox 两项选择、逐项准备状态及批量入口成立。公开 coffee 从正式图像处理入口生成 300×200 PNG、删除元数据，独立文件检查 PNG/尺寸/元数据与界面相符，默认 Preview 实际打开处理图。
- `bd59…`：普通入口左/右停靠分别实际为 `(0,87,72,160)` 与 `(2168,87,72,160)`；读取仅指定公开窗的 CoreGraphics 几何，layer=3。正常退出整个 Host→普通重开→开库→工作模式恢复，右侧标签仍 72×160；按“展开”恢复 `(233,87,420,640)`、三参考及原备注。没有虚拟外屏。
- `bd59…`：普通“准备 ZIP 归档”实际生成 954891 字节、三项、未加密归档。独立 ZIP reader 核对顺序 astronaut/coffee/page、CRC 无错、每项原字节 SHA 相同，原件未动。SHA `039b13d4434803bb21fd091d512c42fcbb39abbf6f07f8f5efa987e3ebaf9204`。
- 用户回执“两张图都已出现”；但指定 `/Users/meigong/Documents/DAM-Dropover-public-receiver` 核查为空。实际目标位置已询问，保留用户报告与观察差异；尚不能登记指定目录接收/字节 PASS。工具自己的快拖也未形成接收，不把 startDrag RPC 的请求状态当 OS 接收。

185 素材、53 尝试/51证据、21 OCR、185向量/1任务、63后台成功/64历史保持。重开前后所选主库 `e3dc6c7a8d28e746f4050725c122aeae5c6096615c22175a6dcfb0873eb51f50`、向量 `2fa5f129fc1333a635311e9d0b1dac14af5cc98635e836057d597548da2df38b`、原件 `f633315b50ff203111b25f88297e79c6257996d2e08c92a1dbd64475055a402d` 相同。新布局单独变化，不修改内容/分析；没有新的推理或未知重发。原迁移库仍冻结。

## 生产接线与检查

原生单项/批量（1–64）都先核 actor、当前成员、所有来源与副本摘要，再交 OS；ZIP 使用实际系统文件图标，图标等待后重新校验。显式准备共用缓存/在途权威、逐项状态、未知提交不自动重复；原件/预览/处理/参考帧分列。图像动作使用 Sharp，真实方向、inside 不放大、透明 JPEG 白底、PNG 无损/质量不适用、元数据实际块反馈。

ZIP 使用固定可信 archiver，最多64项、总输入/单输出各96 MiB、512 MiB共享许可。保留总64份/1 GiB包含记录；旧记录16 KiB、ZIP记录128 KiB。正常UTF8名字/顺序/确定性冲突命名，归档内不执行文件。每项来源与成员在制备及重读都验证。部分本次文件按实际 inode 回滚，未知替换/额外材料保持，不能盲删或盲重试。

活跃文件/视频操作阻止 close/discard/dock；退场先取消自己的 actor，等实际 Host/Sharp/Node ZIP 流与视频写操作结束，再释放资源和窗口。ZIP abort 等压缩 callback、finish/close 后才完成；完成副本保留，晚取消不自动 open。没有伪造进程关闭；Node 流和真正解码子进程分别记语义。

真实生产临时 SQLite 的 ZIP3/64、独立 CRC/字节、取消当前/排队/外 actor/Governor/Sharp/partial inode/晚完成、原件与回收、停靠持久/Host重开、图标/yield撤权回归通过。实际 React 的 batch/image/dock/archive、旧图片/工作集、typecheck/build/context 通过。这些不替代物理系统接收。视频取消回归使用真实 Host 拒绝 PNG 类型，不冒称 Blender 实片。

## REA 已得与未明

包、资源矩阵、Mach-O、Nib/ObjC 元数据已取证，仍区别声明/代码/运行。主程序 Ghidra 完整导入达330秒时限；先提取 arm64 副本，不改原 app，Core 模块分析完成。字符串/selector 与 xrefs 最初定位到数据记录，不伪称函数；后借 native ObjC metadata 确认 `DropoverCore.Control.mouseDown:` 真 IMP `0x3c888`，Ghidra 完整132字节函数与 `_objc_msgSendSuper2`/后续 helper 关系已得（Evidence `ev_55e469ce704156878956ba13890a785b192f3fb2ba751e263933a98b6d43ca60`）。这是局部代码，不是完整 Shelf 算法或全面运行。

REA 原生 public-window 观察工具报 window-mismatch，未记成功；CUA 已完成偏好只读/公开 txt 暂存、普通 DAM 的上述操作。所有账号/秘密配置/认证回调/用户 Dropover 配置及私人文档内容未读取。此前误落私人 Photoshop 文档仅看到接收元数据后停止，不保存/截屏/继续操作。

## 继续

当前在实现：真 clipboard PNG 来源的 Host 接入（非伪 download）、请求幂等/未知恢复；以及已准备副本 open-existing（重复打开不重新复制）和原生UI。须编新候选、普通入口执行及重开后再授资格。其后继续本地输入/文字链接/文件承诺/暂存、列表与命令、监视与系统入口、其他图像/PDF/本地动作等清单；云三组已按用户剔除，不自动扩大签名发行。

原件/手工/唯一 Host、其他 `AGENTS.md`/验收流程 WIP 保持；不全量 reset/clean/stash，不推送。当前公开 ZIP 在 profile 保留；当前 dock 已展开为原正常位置。证据见 `.scratch/dropover-integration-20261009/` 与对应提交，新保留副本勿盲清理。
