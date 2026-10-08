# B 模型管理闭环（2026-10-06）

B 已在指定 Hugging Face / Windows x64 CPU 范围完成。用户可从正式模型页面查询相关模型文件、下载安装或导入已有模型，真实验证后用于分析，并可切换、卸载、撤销信任和找回保存结果。最新用户明确要求 Hugging Face 来源与后端查询全部相关文件链接，没有 DAM 发布者签名材料；这是本轮来源策略的替代范围。A 原证据范围保持，完成 B 后停止，不扩 C–F。

## 普通入口与受测范围

仓库根目录普通 Browser / Desktop 入口：

```powershell
npm run start:browser -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
npm run start:desktop -- "--profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"
```

本轮实际验收使用正式 Windows 打包目录（无需测试启动模式）：

```powershell
Start-Process -FilePath 'G:\antigravity\Design Asset Manager 1001\dist-packages\win-unpacked\Design Asset Manager.exe' -ArgumentList @('--dam-browser','"--dam-profile=G:\antigravity\Design Asset Manager 1001\.scratch\wc01-real-model-library-20261005\run-U4eFuo\profile-04"') -WindowStyle Hidden
```

从可见“打开已有素材库”选择 `G:\antigravity\Design Asset Manager 1001\.scratch\b-model-management-20261006\real-library-01`。省略 profile 会使用正常默认 profile，其数据和模型库存与指定验收 profile 分开。最后重开 Host PID66540、Browser http://127.0.0.1:55129/#/ai/local-models；端口/PID不是固定入口。当前选择 HF2B、正常/10%，实际空闲退出后驻留/准备/计算0，用户可再次“验证并使用”。

页面路径：素材工作区 → AI 与模型 → 本地模型与 OCR → Hugging Face 支持组合 / 导入已有模型 → 核对 → 安装或导入 → 验证并使用 → 任务用哪个模型 → 素材实际分析。文件选择均经 Host 正式 Browser 选择器。账号只由应用内部使用；没有读取秘密、私人素材或浏览器历史。

最终运行候选 `dam-f7bec71152122626`，729 输入，Windows x64 / Electron30.5.1；可信 Python311、Torch/Transformers、CPU float32。当前源码生成身份、实际 asar提取main与out、打包runner与源码runner一致，见 `.scratch/b-model-management-20261006/evidence/candidate-f7bec.json`、`reopen-final.json`。main SHA `45647cc562d96b7f3337196f4319626371439e2886b9ea7327c5b39e5d6a3b0a`；runner SHA `c62faa0f661f4b7cc62a831c7937592999ae8ef4ffb8f4ae72691247dc5744ed`。此前724的原始 `candidate-final.json` 和失败截图保留，没有改写为新候选证据。Python依赖为已有可信环境；软件签名安装发行/macOS/GPU未验证，不由 B 声称完成。

## 已执行的真实路径

| 用户结果 | 实际结果与证据 |
| --- | --- |
| HF 来源与链接 | 最终候选从正式按钮实际刷新 10 个登记相关仓库、78 文件：Qwen3-VL 2B/4B/8B Transformers、三组 GGUF、RAM++、Florence-2、CLIP、WD。逐文件链接固定真实40字符提交；各仓库独立报告访问/许可错误。这是DAM登记相关范围，不是HF全站检索。2B/4B为安装组合，其余catalog-only，下载不代表可以分析。RapidOCR沿已有可信运行包附带模型。`final-hf-backend-links.png`。 |
| 来源信任 | 公开 HTTPS 上游身份、固定提交、长度、SHA-256/Git blob 核对；不是 DAM 发布者签名。无账号 cookies/凭据，逐跳批准 HF/CDN HTTPS，不输出临时签名链接。24小时来源期限、显式复核、撤信任仍有效。原 DAM 签名目录机制保留。 |
| HF 2B 正式安装 | Qwen/Qwen3-VL-2B-Instruct，提交 `89644892e4d85e24eaac8bacfd4f463576704203`，4,266,640,306 字节（3.97GiB）。UI暂停 → 正常退出 → 重开保持字节 → 明确恢复 → 完整校验入库。安装不自动启用；新候选重新真实双色验证后可用于分析。 |
| 用户 4B 来源 | 已有 Qwen4B 完整制品只读引用与受管复制导入。复制8,887,284,080字节（8.28GiB），UI暂停/恢复/完整校验后入库；源制品不修改。新候选的受管副本已实际加载与双色验证。 |
| 2B 真实分析 | 724的coffee独立标签完整保存，旧未知标签审计保留；“强制重新分析标签”明确创建新代次。最终f7bec再次正式独立描述1次、289输入/53输出tokens保存，并重开回读。`final-2b-coffee-tags.png`、`final-f7bec-2b-coffee.png`、`final-reopened-coffee.png`。 |
| 4B 真实分析 | 最终f7bec恢复受管副本信任后重新实际验证，一键保存astronaut标签、描述、OCR 3/3。描述1次、298输入/39输出tokens；OCR实际0文字区域，没有反推。任务默认模型与实际选择同步，反推未分配。`final-f7bec-4b-restored.png`、`final-f7bec-4b-analysis.png`、`final-reopened-astronaut.png`。 |
| 实际资源与切换 | 最终f7bec：4B峰值20.84GiB、加载11.2秒；正常/10%后省资源实际退出4B并选择2B，峰值12.55GiB、加载7.5秒。此前724已验证2B ready省资源复用、质量偏好2B→4B、手动加载/卸载与预算拒绝保留旧配置。重开f7bec真实2B再验证：7.9秒、12.55GiB、2线程，空闲实际退出0.3秒，占用0。工作集与private commit分列。`final-f7bec-auto-2b.png`、`final-reopened-models.png`。 |
| 取消与失败 | 取消安装核对无安装副作用；实际4B下载暂停于283,657,160字节，再放弃只清理本次临时目录，已安装2B仍可用。80%预留拒绝4B激活，旧2B选择/配置保留。`final-download-paused.png`、`final-memory-rejection.png`。 |
| 缺配套/损坏/失败候选 | 正式导入拒绝缺tokenizer与截断权重。完整结构、NaN embedding的可恢复坏副本经724的当前runner真实验证拒绝，资格保持空，旧4B配置保留并可重新加载；退出后撤信任/归档。其runner SHA与最终f7bec相同，后续改动仅服务选择。最终重开再次只读核对坏候选仍 revoked/unqualified。`final-bad-candidate-retained-4b.png`；旧063失败证据保留。 |
| 撤信任与明确选择 | 724撤4B信任后，模型退出/资格清除/结果保留，但素材面板错误地自动选云；只核对后取消，没有发送，`failed-revoked-default-cloud.png`保留。f7bec修复并真实复验：无默认选择时显示占位、禁止缺选择的视觉执行；同一素材独立RapidOCR正式保存1/1；恢复信任仍需真实验证。用户主动选云可核对，本轮取消且没有业务发送。`final-revoked-no-fallback.png`、`final-revoked-ocr-saved.png`。 |
| 资料保护 | 已比对44资产、88原件/必要预览哈希；42非目标或人工资产、9人工描述、确认标签、文件夹关系、非目标OCR保持，integrity/FK正常。只用B公开副本，不冒称原库已验收。 |
| 整应用保存重开 | f7bec从正式菜单正常退出，确认Host34804及其子进程已退出，再重开同一产物Host66540，从文件选择器打开指定库。两模型库存、两素材结果、来源目录和正常/10%回读；请求90/尝试89/效果84/后台60与退出前一致。业务执行审计、unknown、outbox、传输任务及人工关系均不变，无自动重发。`reopen-final.json`、`protection-final.json`。 |

## 必要代码变化与复现

复用 A 的正式进程、共享账本、预处理、执行及效果事务。新增 Host SQLite 模型库存/核对/传输与归属 marker、HF 发现/无凭据网络、数据制品/运行绑定及单一本地模型页面；2B/4B共享一个托管连接和任务分配。模型目录代码/pickle 不执行；支持尺寸和精度有明确边界。

真实问题的修复：Electron30 的 manual fetch 不能正常交接307，改为 `net.request` 逐跳批准；tokenizer/vocab 的有界JSON节点容量调整；切库只读 snapshot 误 drain 安装器，改由正式 shutdown drain；完整 JSON fence 由严格共用解析器接受，额外文字/字段/截断仍拒绝；自动切换预估只信用新鲜、已观测旧RSS，实际仍等旧进程退出后再准入。

2B正式咖啡预览进入贪心重复循环，约110秒首轮截断，第二轮耗尽120秒；确认为与正式任务同 SHA 的输入，4→2线程切换实验已排除。实际应用运行器加入有限 `repetition_penalty=1.1`，同输入诊断17.9秒成功，再经正式UI保存，不能将诊断本身算产品通过。该变化使运行绑定变化；明确“验证并使用”重新绑定可信依赖、清除旧资格，然后完整核验权重并真实验证。不会自动恢复撤信任。

最后修复 `VisualAiPanel` 在已配置默认模型被过滤后采用第一服务的逻辑，并为 `<select>`加入真实空值占位；切素材/库清除旧选择。基础分析Host的 `resolveRule` 同时删除第一可用服务 fallback，只接受显式服务或任务默认。撤信任导致不可用就明确拒绝，OCR不依赖视觉选择。没有将云服务永久禁用，主动选择后原核对路径保持。

聚焦检查：最终typecheck、pack:win、真实React服务选择回归3项、basic controller3项、basic integration18项通过。新回归先证明会自动选云，再修复；集成fixture补充显式任务默认，保留原取消/暂停/幂等/不确定性标准。此前模型库10项、HF4项、资源6项、严格JSON2项、当前runner真实坏权重负向3项的原版本证据保留，未改时间冒称最终重新执行。SQLite测试均用Electron ABI。没有stage/commit/push；既有index SHA `a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c`保持。

本轮新增回归可复现：`node scripts/visual-ai-selection-ui.test.mjs`、`node scripts/run-electron-node-test.mjs scripts/basic-analysis-controller.test.ts`、`node scripts/run-electron-node-test.mjs scripts/basic-analysis.integration.test.ts`。只读保护入口：`scripts/fixtures/b-model-library-oracle.test.ts`、`b-model-execution-oracle.test.ts`、`b-model-protection.test.ts`，均只接触已指定公开副本与模型库存，不读取秘密配置。

## 质量与证据边界

咖啡的主体/器皿/勺子/桌面有效，2B“意式浓缩”与“手绘”缺乏充分图像依据；4B“复古摄影”也是风格推测。建议仍可确认/拒绝，不自动变成人工确认标签，不声称全库准确率。小字OCR未检出不能说画面完全无文字。云端费用/wire数未新增验证；本轮本机用量只记录可观测tokens，成本未知。旧failed/unknown与诊断记录保留，不回写PASS。

截图、只读oracle、故障副本准备和诊断均在 `.scratch/b-model-management-20261006/evidence/`；原 `library-before.json`不覆盖。这里是主Agent同会话自验，没有独立人员复核。B必需路径已成立，停止于B。软件签名安装发行、原生安装器/macOS/GPU、HF其它条目的正式运行与语义索引保持未覆盖；没有官方DAM签名材料时高级签名目录如实显示不可安装，未伪造签名或验证对象。
