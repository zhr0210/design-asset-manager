# 2026-10-09 最终接续检查点：源码/依赖和真实底层执行已准备，用户验收等待解锁

**迁移用户验收尚未完成。** macOS 在本轮 Browser/OCR 操作后锁定，计算机控制工具明确拒绝自动解锁；已请求用户手动解锁，尚未收到回复。此为真实系统操作条件，不能改写成完整PASS。

## 当前可做与准确入口

新目录 `/Users/meigong/Documents/design-asset-manager-macos`，分支 `codex/macos-migration`。
本轮产品代码本地检查点 `62d0e0bfabf964340c6a8bcbdb8bae320d6ca650`；未推送。GitHub main 末次回读仍为 `6b86ef05e558229e2bd87998101ca5678bc228cc`，完整3118源文件树/历史已克隆，git fsck通过；旧Mac目录WIP保留。

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
# 先通过当前 DAM 的“退出整个 DAM → 保留草稿并退出”退出旧 Host。
npm run build
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# 同一唯一 Host 可通过普通 Desktop 入口显示原生窗口；新实例复测须先正常退出。
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

专用公开库 `/Users/meigong/Documents/DAM-public-macos-library` 已从普通 Browser 创建并确认打开；原件/库与旧工程未复制、清理或覆盖。重开要求从正式选择器打开同库。
最后运行的 Host 为更早候选65520（历史端口，仅追溯），不是下面的新产物。**解锁后先正常退出旧Host，再重开新build；不要把新文件构建身份套到旧进程。**

## 真实版本与构建

正式构建 `dam-84ebb436ca5a96e8` / 781产品输入；Source SHA `84ebb436ca5a96e8e815cec809e29e6b21444edfe44cfa2c21b0d6e84f84f873`。
M4 arm64、macOS27.0(26A428)、24GiB统一内存；末次磁盘可用57GiB。Node25.8.0/npm11.11.0，Electron30.5.1、better-sqlite3 12.10.0、Sharp0.34.5。SQLite使用实际Electron入口，没有为shell Node ABI重编库。
Pi0.99.1/独立Node24.21.0重新按官方SHA与原锁准备；真实seal/Main pin `ff5c59ec9be9cc130f8da974c838c8af998f552adb48514c7da85c63c5848156`。
Python3.12.11独立环境 `.scratch/macos-migration-20261009/python`：Torch2.14.1、Transformers4.57.6、NumPy2.2.6、ONNX Runtime1.23.2、OpenCV4.11.0.86、RapidOCR1.4.4；全部精确版本见证据 `python-lock.txt`。依赖检查通过，无Windows CUDA/DLL/venv或账号迁移。

两模型均由正式UI从ModelScope安装/暂停/恢复完成并入库存。Qwen2B为Q4_K_M语言/Q8_0投影，固定Mac运行包llama.cpp b11429/d81235049，38个已核验普通文件，MIT。SigLIP2为google/siglip2-base-patch16-224，固定 `153facb840ceec16916cc7ec0e3bf8757d95f7e3`，Apache-2.0。RapidOCR三权重另从ModelScope RapidAI/RapidOCR固定 `7d0781614ca1a83d5ad9603f713acb2e74855d72` 获取并核对；不执行模型仓库代码。

## 本轮结果与证据分层

| 层级 | 实际结果 | 限制 |
| --- | --- | --- |
| 普通Browser | 首页/创建专用库/确认打开、57仓库目录、两模型计划与安装/明确恢复、两次整应用正常退出、重开保留已收到字节 | 来源是较早实际候选；最终新产物的完整UI消费未验 |
| 普通Desktop | 同profile唯一Host显示实际原生窗口，系统Cmd-Q引出正式退出确认并物理退出 | 未覆盖拖拽/置顶/多屏/文件接收/安全存储/安装 |
| 内部真实Qwen/Metal | 公开coffee正确描述“红色杯碟上的浓缩咖啡、勺、木桌”；physical-footprint峰值1,177,012,672 bytes；退出驻留归零 | 实际Adapter/公开材料，不是UI保存效果 |
| 内部真实OCR | Actual Runtime从实际识字/空图/1600挑战产生资格；page5区域，coffee0区域；峰值865,992,704 bytes | 公共英文页有空格粘连，非整体中文质量验收；没有写活动profile资格或素材 |
| 内部真实检索 | 768维/L2 CPU，英文与中文coffee查询在coffee/astronaut/page三图中均第一；同图cosine、实际close归零；峰值1,490,452,480 bytes | 没有正式用户索引生成、暂停恢复与保存重开；不是广泛质量保证 |
| 内部原生运行包/视频 | 官方Mac tar真执行/架构拒绝/复用/损坏拒绝/恢复，生成H.264实际解码/参考时间/PNG/预取消/close记账/自有物理内存查询 | 生成clip不是Blender真实视频验收；Blender指定源本轮HTTP403 |
| 工程 | npm ci、typecheck、build、context ownership782/782(47显式排除)、完整本机ci:governance、160 Python单测无skip、相关回归、Pi5运行器+17实际SDK受控协议 | 本机治理通过不等于远端两平台CI或所有用户目标关闭 |

所有本轮日志/JSON/精确版本在 `.scratch/macos-migration-20261009/evidence/`，总回执 `migration-checks.json`；真实内容与模型不提交Git。三个内部推理报告明确 `userPathAcceptance:false / activeProfileDbWrites:0`；内部脚本、临时DB与真实模型结果不能替代正式界面。

最新远端Actions37793257740在该main上仍失败。Mac创建规划失败是把Main-only资格目标路径当成公共回执泄露的旧断言，已本机复现并修正；Windows模型catalog tracer报RECOVERY_BLOCKED，本机通过，不能宣称Windows已修复。其余旧UI/全src边界测试按当前已撤下入口、实际shared client与模块责任修正，保留禁用通道、安全/故障行为断言；没有删除用例、永久skip、固定verified或改dispatchAvailable求绿。

## 必需接续动作

1. 用户手动解锁Mac。正常退出旧Host，普通start:browser重开本轮build，显式打开同一专用库。
2. 从“AI与模型→本地模型与OCR”选择本轮OCR文件夹、可信Python环境根，正式重新验证；加载2B CPU/Metal并实际取消/停用，核对资源归零。
3. Copy入库本轮public-sources三图，从可发现入口独立标签/描述/OCR及一键基础分析，核对内容和人工保护，保存整应用重开。
4. 正式验证SigLIP2、生成三图索引、中文/英文/以图检索，取消/明确恢复与索引保存重开；当前内部向量不冒称用户持久索引。
5. Blender官方源恢复后准备其可恢复副本并补Mac视频；Native专项、Eagle、Pi账号本人登录、安装/发行按各自实际证据保持未验。

本轮没有推送/发布/签名、购买或读秘密。WC01、T23/父#24、A–F、Eagle与商业发行父级均不关闭。下文是本轮早期实施检查点，依日期/版本保留。

---

# macOS 源码迁移与验收（实施中，2026-10-09 上海时间）

本轮以 GitHub main `6b86ef05e558229e2bd87998101ca5678bc228cc` 为唯一基准，完整克隆到
`/Users/meigong/Documents/design-asset-manager-macos`，分支 `codex/macos-migration`。
旧 `/Users/meigong/Documents/design-asset-manager` 有大量 WIP，未修改、清理或迁移其数据。
不继承 Windows 资格，不关闭 WC01、T23/父#24、A–F、Eagle 或商业发行父级。

## 当前已实际成立

- M4 / arm64，24 GiB 统一内存，macOS 27.0 (26A428)，原生 Node 25.8.0/npm 11.11.0、CLT、磁盘起始可用约63 GiB。
- 原锁 npm ci 完成，Electron 30.5.1 / better-sqlite3 12.10.0 / Sharp 0.34.5；实际 Electron SQLite Host 回归通过。
- Pi offline-plan 后执行 approved：Node 24.21.0 darwin-arm64 官方 SHA、Pi 0.99.1 独立锁依赖；生成真实 release/Main 绑定。
  本轮 seal `ff5c59ec9be9cc130f8da974c838c8af998f552adb48514c7da85c63c5848156`。5项运行器与17项实际SDK受控协议测试通过；真实账号尚未验收。
- Python 3.12.11 原生独立环境：`.scratch/macos-migration-20261009/python`；Torch 2.14.1、Transformers 4.57.6、RapidOCR 1.4.4、ONNX Runtime 1.30.0、NumPy 2.5.3、Pillow 12.3.0、psutil 7.2.2；pip check及160项隔离 Python 单测通过。
- RapidOCR 三权重另从 ModelScope `RapidAI/RapidOCR` 固定 `7d0781614ca1a83d5ad9603f713acb2e74855d72` 重新获取并逐文件验证，与依赖内置字节匹配；没有运行模型仓库代码。
- 普通 `start:browser` 实际首页 → 创建专用空公开库 → 确认创建并打开 → AI与模型 → 退出整个DAM/保留草稿 → Host实际退出 → 普通重开成立。
- macOS 内存采样修复已被正式 UI 消费：原0.1GiB错误空闲口径改为本机memory_pressure有界查询，新界面显示约9–12GiB、Apple M4共享内存。
- 正式UI已获取57仓库 ModelScope 目录，Qwen 2B Q4_K_M/Q8_0受管下载已开始。
  SigLIP2下载曾到1.06/1.43GiB网络失败，文件保留，已在UI明确恢复。下载不是运行资格。
- Mac AVFoundation解码与自有进程物理内存helper已编译；最新typecheck/build通过，但当前运行的Browser仍是较早memory构建，完整新接线尚须重开实测。

## 运行入口和隔离范围

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run build
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# 先通过应用正常退出唯一Host，再切换：
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

专用库：`/Users/meigong/Documents/DAM-public-macos-library`。
公开原件/可恢复副本只在本轮 `.scratch/macos-migration-20261009/public-sources` 准备，未寻找私人素材。
账号、Cookie、保险库、环境秘密与完整认证回调均未读取。没有推送、发布、签名或付费。

## 必须继续

1. 完成当前两条境内模型传输，真实完整核验；普通UI绑定Python/OCR并记录实际挑战、加载、取消与物理释放。
2. 用最新正式build重开；验证固定Mac GGUF包、Metal统一预算与自有物理内存测量，不以估计/下载授资格。
3. 公开图片Copy入库，独立标签/描述/OCR、一键基础分析；双语与以图索引、查询及保存重开；真实失败/取消保留人工与原件。
4. Blender官方短片准备、Mac视频实际导入/抽帧/重开；Native普通启动可覆盖专项单列，Eagle/安装发行维持未验收。
5. 修复适用迁移检查，执行修改测试、source ownership、必要构建；写最终版本/证据与准确未完成项。

证据：`.scratch/macos-migration-20261009/evidence/`（仅本轮非秘密检查日志）。
最新CI：Actions run 37793257740，两平台安装/typecheck/build已通过；Mac停在Main-only qualification路径断言，Windows停在模型存储tracer。Mac复现前者并修正内外权限断言；后者本机通过，不能声明Windows已修复。
当前治理仍在修复过期模块边界断言，不声称全量通过。原始各次失败日志保留，禁止删除、永久skip、固定资格或调低标准。
