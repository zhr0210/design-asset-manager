# F：Windows 候选与 1 万条专项（2026-10-08）

当前可做：从普通源码入口启动 DAM，或运行本地未签名的解包候选。
本轮修复大批选择的无界并发、真实大库误被隔离、包内缓存污染风险及
安装冒烟的误判。**F 父级未完成，不能称正式发行。**

普通入口（在仓库根目录）：

```powershell
npm run start:browser -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
```

该已采用公开验收 profile 有现存普通 Host；先通过应用菜单正常退出旧
Host 并保留草稿，再启动新版本，避免将单实例复用误算成新候选启动。
不要固定历史端口。打包候选入口为
`.scratch/f-release-scale-20261008/package-final/win-unpacked/Design Asset Manager.exe`
加 `--dam-browser` 与明确的 `--dam-profile=<绝对路径>`；本轮没有安装它。
公开规模库为 `.scratch/f-release-scale-20261008/library-10000`，需从可见
资料库入口选择；直接 Host 选择仅作为内部测试。

## 版本、范围与事实

- 当前源码：`dam-8ddc7686f890b3e3`，786 构建输入，产品版本 1.0.0，Windows x64。
- HEAD：`156a9841e0262465d422283851095bca47979532`；已有 WIP/暂存保持，没有提交、推送或发布。
- 规模导入：`dam-bdd02e4121995e94`；16 MiB 旧保护真实拒绝重开。
- 修复后的规模查询/重开、真实小库迁移与持续测试：`dam-fcc776741fe403b2`。
- 后续 `a52b`/`8ddc` 仅变更打包目标保护/发行安装启动门槛。它们不是
  fcc 持续测试的执行版本；新版包的启动和资源核验分别记录。
- `runtime-equivalence.json`逐个核对两个候选实际 asar：21份其它执行
  资源字节相同，Main只差buildId/sourceDigest/builtAt三个元数据值。
  因此fcc内部领域/运行时证据适用于相同执行代码；UI、安装与发行门槛
  仍需各自新候选证据，未补造新版本操作时间。
- 测试机：Windows 11 Pro 10.0.26200、i5-13600K、64 GiB 物理内存。
  这是实测设备条件，不是已证明的最低配置或所有显卡支持声明。
- 用户将 Eagle/E 的开发与测试留给 macOS；原生专项后续集中验收。
- 全量原件独立流式 SHA 核对：继承库166文件/24种不同字节内容，
  F持续入库后10009文件仍为24种，9985份重复；衍生文件不等于独立创作。
  `source-diversity.json`记录确切范围，不把万条副本冒称万条独立素材。

## 已成立的内部结果

| 路径 | 实际结果 | 限制/证据 |
| --- | --- | --- |
| 生产 Copy/preview/SQLite 入库 | 166 继承记录 + 9834 新副本 = 10000，约 14 分钟 | 3 种新增独立内容；文件选择 seam；非 Browser 入库 |
| 派生索引重建+首查 | 29.486 秒 | 真重建，不把 warm 结果称 cold |
| 词法 warm / 后续分页 | P95 1025 ms / 220 ms；9834 新记录完整分页无漏/重 | 单机词法负载，不是万条向量质量评测 |
| 关闭并重开 Host | 1111 ms；28,942,336 字节主库可读 | 非整应用 UI 保存重开 |
| 非推理工作集 | 峰值约 195 MiB | 单测试 Host；不包含 Chrome/模型工作进程 |
| 真实旧 schema | v1、v13（各24素材）、v14（165素材）→v15 | 不伪造降版本；v1取自实际可读备份 |
| 工程恢复 | 另一可恢复副本覆盖为真实升级前备份后正常 Host 可读 | 非产品 UI 恢复，不破坏源 |
| 独立保护 oracle | 335 原件/预览 SHA、211 canonical 向量、人工记录和历史执行逐项保持 | 指定 D 源与 F 副本只读比较，不冒称原库新验收 |
| 普通包启动 | 新建空 profile，真实 build/platform/version health，确认自有进程退出 | 无不安全启动参数；不证明 UI、模型或安装 |
| 最终8ddc源码复验 | 10009条，重建31.636秒、词法P95 1003ms、分页P95 227ms、重开1148ms；9834条完整分页 | 无新增推理，非UI；`final-scale-result.json` |

原始证据统一在 `.scratch/f-release-scale-20261008/evidence/`：
`scale-result.json`、`scale-import-progress.json`、`migration-result.json`、
`preservation-result.json`、`candidate-final-manifest.json`、`package-final-smoke.json`。
当前包实际签名状态为`NotSigned`，普通Host就绪1105ms；清单核对12169文件、
约509MB、Pi封存11838文件逐个SHA匹配。状态仍`distributionReady=false`。
本地精确差异见[检查点](../checkpoints/f-release-scale-20261008/README.md)。

实际本地后台持续1,808,206 ms（30.14分钟）后确认测试进程正常退出。
9次业务描述+9次OCR，共18项成功效果；10009条记录重开保持，无重复执行，
驻留/材料账本归零。160次观察中Host工作集峰值192.27 MiB。
`background-soak.json`记录实际版本fcc与全部观察。
观察脚本的`queryMs`包含检索和读取后台执行状态，组合P95为2259.69 ms；
不能称单独检索延迟，也没有证明后台并发时两秒响应目标。
正式 source controller、打包 worker、实际已安装 Qwen3-VL 2B Q4_K_M CPU
与 RapidOCR，重新进行真实图像资格核验；没有复制凭据或读取完整设置。
三批计划共9份公开副本/3种独立内容，仅描述+OCR，不回填全库、不发云调用。
provider 调用计数只计业务描述，不包含运行时资格挑战；OCR挑战另计。
这仍是内部接线与持续运行测试，不能关闭普通应用父级路径。

首批实际内容能描述咖啡和荷兰三色旗；宇航员描述有推测的徽章文字，
不声称小模型全部细节正确。三种输入的 OCR 均为空，不把本轮当有字
素材识别质量覆盖；以前有字素材结果保留各自版本，不能转记当前 F。

## 必要差异与验证

- `add-assets.workflow.ts`：八通道源检查保留每项、顺序与正式确认；
  256 个真实 PNG 选择准备回归先红后绿，实际峰值从256降为8。
- `library-open-inspection.tracer.ts`：主库 metadata 上界512 MiB，未整库
  读入 Buffer；metadata/锁限制、只读/身份/sidecar/stamp与 lease 保持。
  真实大库正向、512 MiB+1拒绝和既有负面保护已执行。
- `package.json`：排除 ai-service 环境/秘密文件、DB、缓存、日志和模型；
  明示卸载保留 app data。实际包不含已发现的 translation cache DB。
- builder：先在实际目标 Electron 执行 SQLite/Sharp并记录原生 SHA，才
  关闭重编译；拒绝错误架构和覆盖。没有改写正在使用的 SQLite DLL。
- 普通启动：非敏感 `host-startup.json` 与白名单 `/api/health`，保留
  Host/Origin/CSRF/命名动作保护。既有会话权限不由 health 授予。
- 冒烟：普通启动和确认退出代替“活着即通过”；Windows 安装门槛增加
  `installed-launch`。Sandbox 生成脚本也更新，但本轮未运行安装。
- 相关回归、typecheck/build和 context 检查已执行。context仍报告69份
  untracked执行源码未纳入tracked ownership；完整候选源码由构建闭包
  记录，不能把 tracked coverage 当全候选治理通过。审查是主 Agent 自审。

## 尚未成立

1. Browser 普通入口→1万库列表/搜索/选择/取消→整应用保存重开。
   Chrome 在 fcc 本机首页报 `ERR_BLOCKED_BY_CLIENT`，未进入应用，原因未知；
   未绕过拦截。8ddc 的 Browser 用户路径未执行。
2. Windows 真安装、升级、卸载保库；原生窗口/文件交接集中后续验收。
3. macOS 本机构建、依赖、UI、安装及适用签名；Eagle另留 macOS。
4. 当前 native schema 备份仍限4 MiB；29 MiB以上旧schema升级没有验证，
   不能用512 MiB开库上界冒称升级资格扩大。
5. 正式品牌/签名/发行资格。当前默认Electron图标、未签名本地候选，
   `distributionReady=false`；没有购买、签名或发布。
6. 后台并发的两秒响应目标未证明；本轮30分钟属于分时小批推理与空闲
   回收观察，不是30分钟不停推理或长时间压力保证。

物理断电、kernel故障、十万条、多样万条独立资料、全部媒体/设备及
全库语义质量不在本轮已成立范围。完成当前范围后不自动扩展其它目标。
