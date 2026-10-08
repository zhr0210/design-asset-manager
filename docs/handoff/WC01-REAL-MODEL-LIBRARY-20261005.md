# WC01 真实模型与订阅限定验证交接（2026-10-05）

本轮已完成已批准的模型/订阅测试及浏览器必要路径。gpt-6-luna两张正式分析保存、关闭重开通过；Qwen4B六分析/一次标签经正式Controller/Host通过。RAM失败、8B资源拒绝及内容质量缺口保留。完整第三项UX仍排除，桌面等待后续批准。

## 范围、差异与行为变化

用户批准现有AIModels/models读取执行、ChatGPT订阅、用户厂商登录、保留本机会话；后续指定gpt-6-luna、浏览器优先。数据仅为上批公开样本baseline-v13/work-local/work-cloud独立普通副本，24资产/schema13。没有私人既有库访问、模型/依赖下载、订阅变化、API计费fallback、凭据导出、WIP覆盖、资格绕过或commit/push/发布。

| Before | 实际After |
| --- | --- |
| 公开图上批仅codec/Host测试，真实模型/账号未执行 | 六Qwen分析/一次标签；Luna双色probe与两张正式Browser分析、保存/重开有证据 |
| 既有QwenVL只是兼容HTTP客户端，权重存在不是可用证明 | 离线CPU权重loader是Validated Tracer，经固定Pi及当前正式Controller/Host；不是Runtime Package交付 |
| 旧文档“账号/模型未授权”“产品进程未观察” | 本轮授权已执行，Main45492与实际build绑定；未覆盖项按新事实分类 |
| 首oracle假设legacy asset_folders | 按当前v13明确核对library_folders/library_folder_assets/library_palette_colors并要求存在；旧FAIL保留 |
| 仅userData被误认为完全隔离 | N01–N03 startup读旧settings，记录范围偏差；N04另隔离legacy home，真实safeStorage/network/gates保持 |
| DAM无思考强度控制 | 仍未实现；固定Pi目录/transport证明Luna支持档位，缺接线入队 |

N01–N03没有保存旧全局settings、导出凭据或打开私人库；旧metadata与新vault不匹配产生AI_CREDENTIAL_CHANGED，未发起厂商授权/推理。`evidence/profile-isolation-mismatch.json`保留偏差、失效声明和修正。不能宣称全程完全隔离。N04在Main import前同步隔离legacy home与userData，credential protection、网络、dialog、Runtime/resource/native资格均用真实实现。

## 修改文件与身份

固定点`.scratch/wc01-real-model-library-20261005/run-U4eFuo`。先读`terminal-anchor.json`；候选/build/执行源码/evidence四份manifest均有SHA绑定。证据不遍历private profile/vault/cookies/身份/session，不复制图片/模型字节。

实际修改/新增：

- `scripts/fixtures/wc01-real-model-library.test.ts`：Qwen真实Controller/Host提交、重复/重开/资源检查。只替代dialog与keyless测试settings；vault显式不可用、不读写凭据，Runtime/native/resource不替代。
- `scripts/fixtures/wc01-real-model-library-oracle.test.ts`：独立直接只读SQLite/SHA；不调Host/凭据，核对当前v13用户字段、确认关系和提交。
- 五个普通启动器：`.wc01-real-model-profile-run-U4eFuo.cjs`、`.wc01-real-model-profile-run-U4eFuo-02.mjs`、`-03.mjs`、`-04.mjs`及`.wc01-real-model-browser-run-U4eFuo.mjs`。前三次失败/偏差保留，N04通过。
- 更新`TASK.md`、`docs/handoff/CURRENT-STATE.md`、`docs/handoff/WC01-FAILURE-QUEUE-20261003.md`；新增本交接。三份入口原字节在run/before。
- `.scratch/wc01-real-model-library-20261005`内准备/指纹/Qwen loader/wrapper/启动/浏览器/seal脚本、冻结源码及结果，完整清单见`execution-source-manifest.json`与`evidence-manifest.json`。

产品src、Pi worker/protocol、生产模型wrapper、build字节均未改。新fixtures/五启动器/交接纳入候选但未stage；上批63路径index操作不是本轮。

| 身份 | 实际值 |
| --- | --- |
| HEAD/branch | b5cc954f90d248694aedc2d6ca1aa5188fa0aa11 / codex/windows-workspace-1001 |
| index SHA | a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c，本轮保持 |
| 候选 | 初始3538文件SHA/bytes、六个原已缺失路径；仅三份状态入口修改，其他既有WIP保持；新增文件逐项纳入manifest |
| source/build | dam-2872f61d4321786c；sourceDigest2872f61d4321786cf5f6d39462c609777c552bdfd22467a21f7644049724cd3e；688 inputs/14 outputs逐字节重核对，未重建/重新生成身份 |
| Main | SHA4ca859eaf8457bc68f0e6350a712fb19e5cc1949633019a20134ccad47647599；PID45492/WC01-REAL-N04 |
| 平台 | Windows x64；Electron30.5.1/Node20.16.0/ABI123/SQLite3.53.1 |
| Pi | 0.99.1/独立Node24.21.0 Windows x64；release SHA99e47ca53d91aa342d134125f1980106105e27186ef4f61640c3bc3b98c651c0 |
| Pi资格 | exec03真实Host核对11837文件/162017414 bytes；收尾再核Node/worker/catalog/transport等九pin，不冒充完整release重测 |
| native | bundle-VMRDqd；manifest SHA4023c30f82aa8db0a5fa459aece908db7cbe4b1b49d51036bcddc563c0e89112；源码/打包副本按当前closure核对 |
| Python | 3.11.9/torch2.12.0.dev20260408+cu128；Qwen CPUfloat32/8线程；其余wrapper CPU-only/strict no-mock/断网 |

## 执行、保护与质量

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| Qwen4B | exec03 exit0：宇航员/猫/咖啡/木纹/低对比/4096×3072派生六分析、public02一次标签，重复zero reinference、关闭重开保持 | exec-03/result.json及job/review/duplicate/reopened文件 |
| Qwen资源 | GPU整模不合格，保守实测采用合格CPUfloat32加载4,437,815,808参数，约85–90秒/张 | qwen02-resource-preflight/load/service/request证据 |
| CLIP/WD | 各六次真实wrapper调用完成，五份独立JPEG SHA，text与手工终稿同字节；无正式SQLite/CU声明 | additional-models-02/clip.json、additional-models-03/wd.json |
| RAM++ | FAIL：RAM_plus→init_tokenizer→BertTokenizer.from_pretrained→vocab_file=None→TypeError，strict mock拒绝 | additional-models-03/ram.json，脱敏traceback |
| 8B资源 | NOT_RUN_RESOURCE：float32权重35,068,494,784+8GiB guard=43,658,429,376 > 可用29,781,790,720 bytes；GPU整模不合格 | additional-models-03/qwen8b-resource-qualification.json |
| 模型保护 | 38文件31,036,820,754 bytes SHA/mtime保持，无新增权重；.cache metadata排除 | model-files-before/after.json |
| 独立oracle | exit0，24资产/schema13/integrity/FK、非目标字段、用户确认caption/标签、当前组织关系、全部baseline与48原件/预览SHA保持 | independent-oracle.json |
| 表差异 | 仅assets caption/时间、visual_ai_evidence和七张independent_tag执行表，其他表保持；完整六本地/两云端evidence对照 | independent-oracle.json |
| 资源收敛 | 数值账本0、Pi active0/unknown0；helper停止、终态Main无owned worker，Browser关闭库 | exec03/result、terminal-process-state.json、browser-terminal-closed证据 |

实际使用明确opt-in的仓库Electron Node启动器执行两个fixture；Python使用既有解释器/wrapper，未安装或重编依赖。`verification-and-quality.json`关联工具exit/result；wrapper程序exit0内仍有RAM FAIL，不叫全模型通过。生产源未改，本轮未重复上批316后端、Router268或整套产品测试。

质量未过基准验收：Qwen宇航员prompt加入未证实1970s风格，9tags超提示8个（现契约30，未放宽），咖啡caption/prompt杯色描述不一致。CLIP猫/咖啡候选匹配，但词表没有coins，强制候选不能当开放世界准确率；CMYK样本有公园人物、婴儿车和狗，dog得分不是串图证据。WD将猫建议为天空、4/6空标签，质量有缺陷。Luna两张大体贴图但不是质量基准；prompt仅为AI建议，不是原始prompt/年代事实，未自动确认建议标签。

## Browser用户路径与验收

任务：真实订阅选Luna、核对外发确认、分析公开资产、保存/重开核对结果。正式Browser复用唯一Electron Local Host，Main保有文件/SQLite/凭据/提交权威。profile WC01-REAL-N04资格确认fresh settings、userData/legacy home隔离与真实safeStorage。

客户端Chrome Computer Use extension（版本未另记录）/Windows x64；截图2321×1253、浅色；zoom/DPR/其他尺寸未核验。先试Codex内置浏览器已有裸地址51325，显示“DAM尚未连接/请使用浏览器版入口”；随后普通同profile --dam-browser开启系统Chrome正式入口，连接Main45492。未改route/hash/store/DOM或业务IPC、未伪造grant；后台fixture另列。

| 用户任务/操作 | 预期 | 实际结果 | 状态/证据 |
| --- | --- | --- | --- |
| 普通Browser入口，先IAB再Chrome | 同一正式Host | 裸地址未连接；普通--dam-browser所开Chrome接通 | Chrome PASS，browser-ordinary-entry.json |
| 用户厂商登录，DAM界面读回 | 身份/计划验证、Main保存 | 用户完成授权；界面确认保存，Luna真推理使用凭据 | PASS限定读取/使用，不证明应用重启 |
| AI与模型→保存Luna→取消旧review→重新prepare/验证 | 新单披露Luna/目的地，图片/JSON识别 | 双色probe PASS；旧反馈/旧单缺陷另列 | browser-luna-review/capability-pass.png |
| Browser文件夹选择器打开work-cloud | 24资产限定库 | 正式Host链路打开；未开私人库 | PASS限定库 |
| 正确“查看”→Inspector展开AI→prepare确认→运行宇航员 | RGB白底JPEG≤1024，仅所选图；可用结果 | caption/tags/prompt可见，usage541输入/254输出 | PASS，browser-astronaut-review/completed.dom.txt/png |
| 同样真实打开猫并prepare/运行 | Inspector目标正确、结果贴图 | 勾选checkbox不等于切换；已核对图片，usage414/257 | PASS，browser-cat-review/completed.dom.txt/png |
| 资料库管理关闭→重新打开上次库→逐张查看 | 结果/时间保留 | 两caption与独立磁盘oracle逐字一致，时间保留；prompt草稿只读取未采用 | PASS，两个reopened.dom.txt/png |
| 最后关闭库 | 释放活动库、保留Main会话 | 页面回到“重新打开上次素材库” | PASS，browser-terminal-closed.dom.txt/png |

| 问题 | 复现/影响 | 修复或恢复/复测 | 结论 |
| --- | --- | --- | --- |
| gpt-4.1-mini probe | 失败且提示配置/凭据变化 | 用户指定Luna后成功，未定位旧根因 | 原FAIL保留，不能说模型不支持 |
| probe自身能力保存 | 成功后显示“另一界面修改” | 采用当前已保存配置可恢复，无源码修复 | FAIL未关闭 |
| 旧review残留 | 失败/换model后仍显示旧确认 | 正式取消后重新prepare/执行Luna | 恢复PASS不等于缺陷修复 |
| 初始隔离 | N01–N03旧settings startup读取 | N04另隔离legacy home后重新启动 | 偏差保留，N04限定通过 |

外发目的地https://api.openai.com/v1/responses。两张库分析usage共955输入/511输出tokens，costEstimateUsd=null/费用未知。确认的UI动作是两次probe尝试（gpt4.1失败、Luna成功）和两张分析；每张最多一次截断重试，尝试上界6，准确wire次数未观测。固定SDK对Sign in with ChatGPT省略max_output_tokens/temperature，256/1536/3072只是请求参数；初始768是Agent临时计划不是用户硬预算。没有云端tag追加、API fallback或读取cookie。

Browser上述路径PASS；遗留反馈/review FAIL；焦点/快捷键/其他尺寸/长内容、账号取消/应用重启/锁定恢复NOT_RUN。Desktop本轮NOT_RUN，先前Escape/窗口阻塞保留。整体第三项产品复测USER_EXCLUDED，不能宣布全部UI/UX完成。

## Pi思考强度与后续建议

固定Pi0.99.1的`providers/data/openai.json`中Luna reasoning:true，thinkingLevelMap为off→none、low/medium/high/xhigh/max同名、minimal:null。simple options reasoning可经clamp映射到Responses reasoning.effort；不能泛化所有模型。

DAM的`src/shared/contracts/ai-connection.contract.ts`没有档位投影；`src/main/ai-gateway/ai-connection-service.ts`只透传model/prompts/image/maxTokens/temperature；`pi-runtime/worker.mjs`stream没有reasoning，兼容分支固定reasoning:false/supportsReasoningEffort:false。因此Pi支持，当前DAM未接线；Luna当前SDK缺省映射off→none。本轮未观测wire payload或测试其他强度。

下批仅建议：配置/支持档位投影、reasoning契约、UI、backend/review绑定与确认、不支持档位拒绝；先隔离transport再Browser复测。同时聚焦probe自身配置反馈和旧review失效，不放宽Host校验。RAM离线补齐、8B低内存/资源策略另行限定范围，建议不新增下载/安装/额外外发或桌面授权。

浏览器不能证明、需后续批准的桌面清单：

1. 正常应用重启后safeStorage读回、系统锁定/不可用/撤销状态恢复，不导出凭据。
2. 原生账号取消/退出、系统浏览器回调后的窗口焦点/生命周期；厂商输入仍由用户完成。
3. 原生工作窗口/浮动卡片、置顶/跨屏/系统快捷键/跨应用交接，属于整体第三项追加范围。

尚未验证私人旧库、安装包/macOS、大库schema升级、kernel故障/断电/restore、其他Provider/档位、完整质量与产品UX。Windows备份资格仍为上批NTFS/x64/pinned profile/初始≤1MiB/growth4MiB，本轮v13副本未再次升级，不能泛化。

## Remote Desktop Commander终态锚点

- 本轮`terminal-anchor.json`及其manifest SHA为入口，原公开图片run-efo39hjx锚点SHA保持，旧FAIL不覆盖。
- Main PID45492/WC01-REAL-N04/build dam-2872f61d4321786c，先核对`terminal-process-state.json`和Main SHA。授权会话保留在本机profile，不读取/复制vault/cookies。
- Chrome现成正式DAM tab连接该Host，测试库已关闭；仅普通资料库管理选择本轮work-cloud，路径由run标签定位，不复制认证grant查询链接。
- 同profile普通secondary入口为`.wc01-real-model-browser-run-U4eFuo.mjs`配合--dam-browser；`open-browser.mjs`有wx封存保护，不重复准备脚本。
- Qwen/其余模型helper已停止，owned Pi worker0；baseline不写，无继续推理/下载/自动恢复任务。
- 完成STOP，不自动下一阶段、桌面输入、commit/push/发布或数据清理。
