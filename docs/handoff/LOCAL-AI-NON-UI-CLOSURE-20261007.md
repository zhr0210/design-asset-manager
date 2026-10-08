# 本地 AI 底座：无界面收尾（2026-10-07）

本轮按用户要求完成相关回归、数据保护核对、质量/性能对照、审查整改和任务检查点整理，全程没有操作 Browser、Desktop 或运行 GUI E2E。当前源码正式构建为 **dam-a97d912710065a56**，757 个构建输入，typecheck/build 通过。父级与 T23 仍未完成：当前产物的普通入口联合验收、压力、索引故障与大库交互、原生和最终保存重开尚待。

普通启动入口仍为仓库根目录的命令：

```powershell
npm run start:browser -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
npm run start:desktop -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
```

启动器打印本次实际地址，端口不是固定入口。本轮没有退出、重启或读取正在运行的旧 565d 界面；旧进程、地址与截图不证明 a97d 已从用户入口验收。指定公开主库为 `.scratch/b-model-management-20261006/real-library-01`，后台实验使用 `background-ca8819d6-7793-4549-8e43-bc50eac77293/library` 可恢复副本。

## 本轮完成与证据

| 项目 | 结果 | 证据和实际边界 |
| --- | --- | --- |
| 相关回归 | 70 个 TS/TSX 文件最终通过；Python 160 项通过；静态颜色对比与 context 检查通过 | 初始 57 文件完整套件及受影响/补充复跑，不是全仓库或 GUI 全套。完整账本见 [validation-final](../../.scratch/local-ai-implementation-20261006/non-ui-validation/validation-final.json) |
| 数据保护 | 两个指定公开库只读核对通过 | 各自原 88 原件/required previews SHA 不变、9 人工描述、22 条受保护 OCR、确认标签与文件夹关系不变，integrity/FK 正常；[保护记录](../../.scratch/local-ai-implementation-20261006/evidence/protection-non-ui-final.json) |
| 质量/性能对照 | 真实保存效果与阶段记录已按模型、能力、输入 SHA、加载计划和构建配对 | [对照记录](../../.scratch/local-ai-implementation-20261006/evidence/performance-non-ui-final.json)，历史观测不是当前 GUI 重验或多次基准 |
| 审查整改 | Standards 原 3 项 P2、Spec 原 4 项发现均已修；两轴只读复核未再发现明确 P1/P2 | 范围和整改分轴列于下文；主 Agent 执行回归，复核 Agent 没有代写或操作界面 |
| 交付与安全检查点 | 精确任务补丁、输入/候选哈希和证据整理到本地检查点 | 50 个文件与旧 WIP 重叠；源码保持工作区，不整文件提交旧 WIP，不纳入其他暂存，也没有推送或发布。检查点以实施起始快照为基线，不能冒称干净 HEAD 的完整源码交付 |

当前候选的两个实际模型内部验证：

- [冷加载取消与离线重核验](../../.scratch/local-ai-implementation-20261006/cold-cancel-f97a7f87-f340-4a7c-8c9d-9067242fa5ea/result.json)：真实已安装 2B CPU，取消后允许完整制品重查和实际图像资格，实际退出后驻留归零。网络拒绝。
- [一次 OOM 故障恢复](../../.scratch/local-ai-implementation-20261006/oom-fault-b683523c-9fa5-43fc-a70c-f0eff45f069e/result.json)：注入一次自有 GPU OOM，同模型/量化实际 CPU 方案返回公开 coffee 描述；2 次物理调用、1 个保存效果、失败及恢复审计保留，退出后驻留归零、库重开效果数不增。它是故障注入和内部 Host seam，不能称自然 OOM 或普通界面通过。

## 回归中的失败如何处理

最初 57 文件有 5 个文件失败，原日志保留于 `non-ui-validation/initial-failures/`，没有删除或转记为首次通过：

1. 两组后台 OCR 观察测试的 768 MiB 夹具低于新的完整 Host/Worker 预算，根本没有到达 claim/sent 断言。改用真实预算常量加余量，保留运行时变化、撤权、旧控制器和实际派发断言；两组通过，生产资格检查未放宽。
2. 标签批处理的三个旧零占用断言与有界准备缓存不一致。现在分别要求活跃 requests/preparing/frozen 归零，剩余字节只能等于已分账缓存；显式回收后物理字节必须归零。12 项通过，原幂等、取消、并发和效果断言保留。
3. OCR 进程生命周期中一次 PID 探测断言失败。代码和 17 项断言不变，隔离复跑通过；根因未确认，保留偶发风险，不宣称已证明某种 OS 竞态。
4. Electron Node20 的实验 MockTimers 在 `clearTimeout(undefined)` 抛自身内部错误。此纯逻辑测试按 package.json 的标准 Node v25.7.0 入口通过 4 项；其他 SQLite/Host 测试使用 Electron30.5.1/Node20.16.0/ABI123。没有修改生产时钟语义。

补充回归还发现一个旧静态断言要求 Renderer 导入 `projectAssetDiscovery`，与现在正式 Host 分页搜索冲突。移除这条过时实现位置断言，保留共享字段/中英查询/标签/解释断言；Host 实际搜索与分页由两组集成测试核对。Python 标准入口命中不可用系统别名，改用已指定 Python311，保持离线与独立缓存/数据库/模型目录；160 项通过，其模拟依赖不计真实模型资格。

context 首次检查也发现相同的旧 Renderer 锚点，已把单个路由锚点改为正式 `useHostAssetSearch`；检查通过。52个既有未跟踪一方源文件没有进入可信 ownership 计数，保留原 warning，不伪造完整登记。

## Standards

固定基线为 `.scratch/local-ai-implementation-20261006/before` 实施起始快照；审查时 HEAD 为 b5cc954f90d248694aedc2d6ca1aa5188fa0aa11。原冻结候选 565d 的三个 P2：文字回退遗漏 folderId；混合查询失败留下未登记临时 hits；准入失败泄漏 SQLite 索引读者。

现在 Host 完整传递文件夹条件与取消信号；混合文字 lane 在排名许可前完成；失败路径清理 snapshot/hits，读者许可的 acquire 也纳入 finally。回归用 quiet 单槽、取消后重建及 Windows 旧索引实际 rename 验证释放。复核同时核对 OCR 预算与标签缓存测试修改，没有降低保护标准，未发现新增明确规范问题或需单列的 Fowler 异味。此轴静态复核，测试由主 Agent 执行。

## Spec

原发现包括：P1 混合查询单槽嵌套许可自锁；P2 文字回退丢文件夹范围；后续 P1 文字回退无法取消及外部图授权返回前不复核；P2 库内查询图缺来源代次。

现在文字回退也注册查询 controller，传递 signal 并在返回前检查取消/库权威；查询图将 id、revision/thumbnailRef 指纹绑定快照，在嵌入后、返回与翻页前检查 active 状态和视图一致性；外部图 action 返回前复核撤权、到期和库范围，缓冲仍等实际使用结束才释放。回归覆盖在途撤权、查询图 Trash 后结果拒绝及旧分页失效。该轴复核未发现指定整改文件中的剩余明确 P1/P2；不构成整产品或 GUI 通过。

两轴原发现分别为 3 项 / 4 项；整改后指定范围剩余明确问题分别为 0 / 0。尚待用户联合验收的父级范围独立保留。

## 性能与质量的可用结论

同一 coffee 冻结输入 SHA 为 `54e2205caf1c4d698b9ae3bcaca2666c1ef54cec266076f35de30a591083c07f`。阶段 operationId 对应实际 attempt_id，再关联已保存效果；不以 request_id 错配推理阶段。

| 模型及能力 | CPU | GPU | 混合 | 实际构建与限制 |
| --- | --- | --- | --- | --- |
| 8B Q4_K_M / Q8_0 描述 | 49,918 ms | 1,972 ms | 未纳入同能力比较 | 22bc，同输入/recipe、同描述、349/37 tokens，各一次；约25.3倍仅是该推理阶段观测 |
| 8B 同组合标签 | 未纳入同能力比较 | 1,608 ms | 16,859 ms | 22bc，同输入，独立标签能力，不与描述耗时混比 |
| 4B 同组合描述 | 早期17,426 ms | 515 ms | 7,734 ms | CPU来自0f86日期记录/截图；GPU与混合为a73e已保留阶段；不是同构建基准 |
| 2B 同组合描述 | 10,649 ms | 555 ms | 本轮没有同能力对照 | 0f86日期记录/截图；混合5,568 ms为标签，不冒充描述比较 |

早期 0f86 的资格工作集峰值为 2B CPU/GPU/混合 2.73/1.62/2.43 GiB，4B 5.14/2.94/3.80 GiB；8B CPU 执行观测8.97 GiB、完整预算约9.8 GiB，GPU资格5.01 GiB。资格加载峰值和素材执行峰值分别标记，不拼成同一测量。GPU成本来自自有运行器 buffer 日志及逐设备新鲜余量，未取得进程 NVML 精确值；全局 GPU 空闲不等于 DAM 自身占用。

主体杯/碟/勺/木桌可找回，但 2B 标签“咖啡豆”存在推测；8B“红白相间”与画面红棕杯的颜色措辞不够准确。OCR 公开 page 的5区主体可读，仍有空格粘连。SigLIP2 真实宇航员/荷兰旗中英/混合各2/2及44素材 coffee 的中英/混合前三已记录，同时保留中文纯色弱项；不能从小样本推断整体准确率。120份同图命名副本只作分页夹具，不是120个独立质量样本。

加载、排队、推理、校验提交、释放分阶段；未测首 token、分位延迟、重复样本稳定性、费用和完整路径排队保持未知。[冻结历史诊断](../../.scratch/local-ai-implementation-20261006/evidence/diagnostics-22bc-frozen.json)包含22bc/a73e原构建身份，禁止转记当前a97d。

## 当前仍未完成

当前产物的普通 Browser/原生联合保存重开；当前中英文/混合/跨语言与库内外以图联合入口；派生索引损坏恢复及120分页/文件夹/工作集交互；指定 Chrome 页面的真实桌面压力与加载调节；最终普通应用取消/离线联合矩阵。两份修改的 GUI 测试 `local-dam-connection-view`、`local-dam-native-start` 按本轮限制未运行。

模型目录、下载和恢复继续限定 ModelScope 境内源，禁止 HF/hf-mirror 与国际回跳。未读取或导出账号秘密；未推送、发布子票或关闭父 #24；本轮止于这五项无界面工作，不扩 C–F。
