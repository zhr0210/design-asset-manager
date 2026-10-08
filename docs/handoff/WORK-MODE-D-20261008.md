# D：视频参考与文件交付（2026-10-08）

本轮已经交付 Windows 普通 Host / Chrome 的受管 Copy 路径：视频入库、播放与定位、多张参考帧、顺序/人工备注/公开来源、独立文件副本、交付历史及整个应用保存重开。用户要求桌面专项后续集中验收，因此 **D 父级仍未完成**：创作应用真正接收、原生拖拽/窗口效果及多屏不能由 Browser 下载或内部 OS port 替代。止于 D，不扩 E–F。

## 普通入口与现在可用的结果

在项目根目录运行：

```powershell
npm run start:browser -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
```

“打开已有素材库”选择项目内 `.scratch/d-work-mode-20261008/library`，再进入“工作模式 → D · 开放短片与创作交付 → 视频与参考帧”。这是指定 C 公开库的独立可恢复副本，C 源库保持 v14，不冒称唯一原库的验收。视频首次确认 Copy 会明确先备份、升级至 v15；旧版应用不能打开 v15，取消导入不升级。

当前正式产物 **dam-452db36be3f6a1ad / 775 输入**，软件 1.0.0，Windows x64 / Electron 30.5.1。最后同一产物正常退出再普通启动：Chrome3 Tab1000402472，`http://127.0.0.1:50183/#/library`，Host PID3472 / CLI29376。端口和 PID 随重启变化，固定入口是上面的命令。帮助与关于已可见核对构建编号、win32/x64 和普通运行；没有测试专用启动参数。

用户批准 Blender 官方开放许可短片。Big Buck Bunny 来自[官方影片目录](https://download.blender.org/peach/bigbuckbunny_movies/)，文件 64,657,027 字节、320×180、24fps、约9分56秒，SHA256 `f78f39603e6774907f2faafabf26a667f4a6fc31769ec304a8a8f7c62d280508`。[官方许可页](https://peach.blender.org/about/)明确 CC BY 3.0；摘录归属为 `(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org`，已记录在工作集与帧备注。原视频不提交至 Git；来源下载及测试文件留在本任务目录。

| 可见操作与实际结果 | 状态与版本边界 | 本任务 evidence 中的证据 |
| --- | --- | --- |
| 添加素材 → 本机文件选择 → 核验 MP4 → 确认备份升级与 Copy。文字搜索 Big Buck Bunny 找回1/1 | PASS，3f114；最后452正常打开同一 v15 库，166/166文字覆盖 | `new-build-copy-confirmation.png`、`after-import-old-candidate.json`、`same-build-reopen-dom.txt` |
| 真 MP4 播放画面推进，暂停后可定位整个视频。请求30.123秒得到实际30.125秒；请求120.456秒得到实际120.4583333秒 | PASS，db572真实取帧；相同原生解码器及 Host 回归持续核对，452重开回读 | `two-frames-saved.png`、`downloads-and-preservation.json`、`same-build-reopen-two-frames.png` |
| 保存两帧顺序、中文与 English motion reference 备注、用户提供的官方来源 URL；选择120秒帧 | PASS，18c143保存与成员操作；452正常整应用重开 | `same-build-reopen-dom.txt`；DB帧/状态签名重开相同 |
| 视频成员移除、保存，再由可见“添加参考”重新加入并恢复顺序 | PASS，18c143；原视频、两帧、备注和交付文件保持 | `member-removed-preserved-dom.txt`、保护 oracle；452回读 |
| Original MP4、首帧 Preview、所选 Reference Frame、图片 Compatible PNG。独立准备 → 下载 → 回读完整字节 | PASS，db572生成；452从保存历史再次实际下载四类，哈希/尺寸一致 | `final-reopen-downloads.json`、`downloads-and-preservation.json` |
| 额外预览副本实际下载并读完 → 取消清理仍保留 → 明确清理 | PASS，18c143，正式 `shell.trashItem` 完成、历史4→3、App副本目录消失；下载文件/视频/参考帧保持。没有宣称回收站界面恢复通过 | `final-cleanup-dom.txt`、`verification-summary.json` |
| 实际取帧取消：先显示等待退出，完成后核对已有帧；不新增500秒帧 | PASS，db572与18c143；自有 video.exe 退出后计数0。取消可能保留已经完成的播放位置保存，不能宣称整个复合操作回滚 | `cancel-actual-video-dom.txt`、`final-cancel-dom.txt` |
| 不含账号的公开 URL；带 `?lang=en` 的输入被拒绝，已保存来源与备注保持 | PASS，db572；拒绝结果保留，未保存参数 | `source-rejected-dom.txt` |
| MP4 退出整图语义生成/覆盖/复用/重建及示例；文字搜索和视频参考继续可用 | PASS，18c143可见165/165图片、166/166文字与原因；452同一回读 | `final-video-search-boundary.txt`；真实视频 Host 回归先红后绿 |
| 相邻图片语义路径真实中文“木桌上的咖啡杯”、英文“a cup of coffee on a wooden table” | PASS执行与找回，18c143：中文长条/大图变体在前、咖啡复制第三；英文咖啡复制前列。保留排序局限，不冒称质量全面改善 | `final-semantic-zh-dom.txt`、`final-semantic-en-dom.txt` |
| 452同一产物正常退出0，再普通启动、选择同库、从工作模式找回 | PASS，暂停120.458333秒、2列/2成员、所选120秒帧、两帧顺序/备注/来源及3+1交付历史保留。无草稿/未保存窗口/登录任务 | `same-build-exit-review.txt`、`same-build-reopen-dom.txt`、重开前后 oracle |

四类回读：完整 MP4 64,657,027字节、SHA与官方源相同；所选帧 PNG 129,952字节/320×180；首帧 PNG 478字节/320×180（影片起始黑画面，不能冒充内容摘要）；咖啡兼容 PNG 624,658字节/600×400，与原图尺寸一致。帧保留实际/请求100ns时间、父素材、源 SHA、完整解码尺寸、生成方法与变换；没有新无来源原件。下载文件在 Downloads，App持有的交付副本另外独立保留。

## 必要代码差异与失败修复

复用既有工作集/WorkspaceClient/Native token、Capture、Active Library、修订/幂等/草稿与唯一 Host。`work-media` owns v15 的帧和视频状态；Windows Media Foundation 自有 MIT helper 真正解码 H.264，不下载编解码器或执行外部仓库代码。正常构建把受源/制品指纹约束的 `video.exe` 发至 `out/main/windows-video/`；512 MiB Governor 预算串行解码，helper在解码前施加384 MiB process commit限制。取消/关库保留占用直到实际进程 close，失败旧帧保持。

原件、首帧预览、参考帧与交付副本分离。`work-file-handoff` 保留来源与转换记录、核验成员/源版本/完整字节，64份/1 GiB保留上限；仅明确清理调用系统回收站。Native私有actor/token限制拖出已准备副本；默认应用打开只返回“已请求打开”，不伪造接收成功。当前正式交付支持受管 Copy；Reference/Eagle 外部原件交付保持拒绝，没有移动/覆盖外部源。

真实升级第一次失败：1,638,400字节数据库超过旧1 MiB初始备份映像边界。已同步正式profile、来源、Native传输与target初始输入到4 MiB，近4 MiB真实 SQLite备份回读、包内 Runtime及C副本升级通过。**制品1 MiB校验、128 MiB进程/256 MiB job、已有VFS journal/source增长约束、身份/空间/事务/commit证据均保留**；没有把 dispatch 或 qualify 固定为成功。大于4 MiB初始映像的Windows维护路径仍明确未覆盖。

真实播放可推进却无法跳转：缺少 HTTP字节范围导致Chrome seekable为0，第一次错误生成0秒帧。已在成员/内容核验之后共用GET/HEAD单字节范围（200/206/416），Browser、Main protocol及隔离Native工作窗口接线；不加任意文件入口。旧0秒帧关系经正式界面移除，文件/证据保留，不改写为成功。取消提示在Host准入队列和解码阶段均要求核对保存结果，实际退出后不继续显示等待。

相邻图片检索曾把视频首帧算成整图覆盖。已排除MP4的计数/入队/复用/重建/示例，旧向量不删除，词法和混合文字命中保留。回归暴露的初版选范围 `else` 绑定问题已修复，三图既有索引生成再次通过。中文排序仍有长条变体优先及低相关尾部，120同图复制不作独立质量样本；没有针对这两个查询改词条、答案或排序。

## 原件、人工、审计与版本证据

C源库仍v14、165素材、330文件，31张白名单相关表全部旧列内容一致。D副本增加一个视频及D工作集；逐行核对旧165素材与候选/收录/关系、全部人工编辑和旧工作集，原330原件/必要预览SHA保持。基础分析请求108、尝试105、证据99、后台执行60/历史78以及独立标签完整记录均未增加或改写；未知状态没有自动重发。

独立 canonical DB 的211持久向量、7任务及活动空间SHA重开前后相同：向量 `1f224330f2c99db4402daf49a882faf64f5510efa508047cef1163104861c2ac`，任务 `e3da013c27ee01fa76f24de5316d5538e71f761a71791bef30dfc132ca836bee`。当前有效图片覆盖165/165，不是211份当前素材。D有335文件（原330＋视频/预览＋3帧文件，其中0秒关系已移除）；同一452最终正常重开所有已核对表、文件、向量和任务完全相同。

相关检查已执行：真实codec/Host媒体、既有WorkSets、媒体HTTP范围/认证、Windows备份Native/source/resource/commit/journal、C副本升级、图片检索Host及文字/颜色Host；typecheck、正常build、context通过。改动的测试实际运行；没有宣称全仓库所有套件或安装包通过。context仍警告68个untracked源码不计可信ownership覆盖。两轴静态**主Agent自审**发现并补齐隔离Native protocol的Range遗漏；不是另一个工程师或独立UI验收。

证据目录 `.scratch/d-work-mode-20261008/evidence/`；[精确检查点](../checkpoints/d-work-mode-20261008/README.md)保存任务补丁、候选/原字节哈希及精选证据。源码与已生成平台资源留在工作区，保护先前WIP与暂存条目；本轮未commit/push/发布。初始备份失败、早期0秒帧和各候选范围均保留，不能转记为最新全量通过。

## 未完成及下一动作

Native专项 `NOT_RUN`：指定设计/剪辑应用的真实打开/导入、拒绝/不支持/目标应用关闭；真实Windows拖拽、置顶/隐藏/恢复；实际多屏、断开显示器后的可见性；原生安装与平台效果。按用户安排后续集中验证，不把浏览器下载、toast、默认应用请求或内部假OS port替代这些结果。因此D父级保持未完成。

当前范围仅Windows H.264未旋转MP4，≤96 MiB、≤1小时、≤3840×2160；最多100帧。macOS/其它编解码器、Reference/Eagle原件交付、全视频智能/录屏未交付。旧T23指定Chrome压力与父#24仍维持原状态；本轮不重新执行A–C、不启动E–F。
