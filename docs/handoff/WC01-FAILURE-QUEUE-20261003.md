# WC01 当前失败与后续队列（2026-10-05）

2026-10-08接续审计：[WC逐项对账与剩余验收](MACOS-REMAINING-ACCEPTANCE-20261008.md)。
WC01整体仍PARTIAL；A–F限定结果只补相应范围，不自动关闭WC父级。
下文保留2026-10-05身份；旧Windows blanket拒绝和旧未授权描述不覆盖
后续正式接线/用户许可，原FAIL/UNKNOWN/未覆盖项仍保留。

当前build dam-ddd88ccd17321322；最新为[Pi思考强度接入](WC01-PI-REASONING-20261005.md)，终态`.scratch/wc01-reasoning-20261005/run-J24R9B/terminal-anchor.json`。旧两项/Router与[上批真实模型](WC01-REAL-MODEL-LIBRARY-20261005.md)按日期/层级追溯；不能沿用旧build或PASS冒认当前进程。下一动作仅建议，不自动执行或恢复整体第三项产品复测。

## 已关闭的限定项

| 项目 | 证据 | 当前结论 |
| --- | --- | --- |
| Windows blanket backup refusal | 上批production27/27、qualification4/4、native14/14、settlement1/1 | 正式Adapter限定NTFS/x64/pinned profile资格；drift/UNKNOWN/其他profile仍拒绝 |
| H09/H12/H10 | 上批30/30、30/30、13/13 | 正式临时库备份/回滚/取消/来源不符拒绝，frozen fixture SHA保持 |
| H13/H16/H08/private maintenance | 上批19/19、35/35、12/12、37/37 | 各备份调用方回归，不代表所有模型/OCR/UX可用 |
| C01/C02 VisualAdmission | 上批isolation10/10、integration10/10、公开图codec | 局部视觉拒绝不冻结OCR/Pi，资源危险/UNKNOWN门保持 |
| C03默认Router | 上批268场景、三route、ownership708/708；63命令依赖纳入index | 原INDEX_DRIFT/BUDGET证据保留；16k/full-file/safety-required不变；本轮index保持 |
| 多样公开图新库 | 上批exec04九步，24入库、坏图拒绝、适用v1→v12→v13升级/完整备份 | 用户状态/原件/重开/资源0通过，私人旧库不在范围 |
| Qwen4B | 本轮exec03 exit0，六分析+一次独立标签、零重复推理/重开 | 真实tracer经正式Controller/Host；loader不是正式Runtime Package |
| gpt-6-luna限定Browser | 用户登录、双色probe、两分析及关闭重开 | Main真实safeStorage/网络，正式持久化PASS；原生/全部UX不在结论中 |
| 独立oracle/字节保护 | 24资产/schema13、48原件/预览、38模型文件/baseline保持 | 当前用户字段/确认标签/组织关系及非目标表保持；cache metadata排除 |
| DAM reasoning接线 | 最新参数19/19、组件7/7、相关回归48/48，正式Browser low探测/单图分析/重开 | 配置/绑定/确认/重试及能力/视觉证据接线；Luna六档支持、minimal拒绝、旧默认binding保持；其他真实档位未调用 |
| probe自身保存/旧review | 最新Browser PASS，组件own-save/失效/失败退休用例PASS | 不再假报外部修改；草稿变更与失败清理单次review；旧上批FAIL保留 |
| 快速取消目录耗槽 | 最新首build FAIL→修复build PASS，连续三次取消/恢复 | 成功静态目录缓存、同key在途请求复用；不缓存账号/Runtime资格，原资源门不变 |
| reasoning独立oracle | direct readonly SQLite及字节保护PASS；本轮24资产/1条Luna low证据 | source/revision/preview一致，其他23素材/人工字段/确认关系、61 baseline与48原件/预览保持 |

旧production run06 26/27、intent run03 29/30取消分类FAIL和后续run07/run04 PASS均保留。旧事实从[两项实施](WC01-CLOSE-12-20261005.md)、router-version锚点和[公开图交接](WC01-DIVERSE-IMAGE-LIBRARY-20261005.md)按日期追溯，不伪装成本轮重跑。

## 已观察失败与限制

| 项目 | 当前分类/影响 | 后续建议 |
| --- | --- | --- |
| N01–N03隔离准备 | FAILED_SETUP/SCOPE_DEVIATION：startup读取旧全局settings；无保存/凭据导出/私人库打开 | N04已另隔离legacy home；保留偏差，后续收敛产品profile路径权威 |
| gpt-4.1-mini probe | FAIL，泛化配置/凭据变化提示，根因UNKNOWN | 留原截图，不能宣称模型不支持；用户指定Luna后通过 |
| probe自身保存反馈（历史） | 上批Browser FAIL；最新reasoning批限定修复/复测PASS | 原截图/失败记录保留，不把通过扩为全部并发配置矩阵 |
| 旧review残留（历史） | 上批Browser FAIL；最新草稿变更/失败退休复测PASS | 未放宽Host单次授权，历史证据仍可查 |
| 快速取消（首次构建） | dam-de66991c9eecccab Browser FAIL，目录请求耗尽槽位 | dam-ddd88ccd17321322连续三次复测PASS；首build及FAIL截图保留 |
| 未保存配置导航 | OBSERVED_LIMITATION，当前返回工作区直接丢弃草稿，保存low保持 | 未新增导航确认；若需保留/确认草稿，单独限定交互任务 |
| 订阅token限制 | LIMITATION：固定SDK省略max_output_tokens/temperature，maxTokens非硬cap，费用未知 | 透明呈现实际控制/usage，保持请求数与期限，不伪称厂商cap生效 |
| Qwen质量 | OBSERVED_LIMITS：未证实1970s风格、9tags超提示8个、杯色描述不一致 | 执行PASS与质量分开；prompt只作建议；未改30标签契约求绿 |
| CLIP/WD质量 | EXECUTION_PASS_ONLY：CLIP词表不含coins却强制分类；WD猫→天空、4/6空标签 | 检查候选词表/映射/阈值；六调用仅五份独立SHA，不虚报准确率 |
| RAM++ | FAIL_DEPENDENCY，缺离线BERT vocab，vocab_file=None，mock拒绝 | 离线盘点/补齐另获授权，不自动下载/安装 |
| Qwen8B | NOT_RUN_RESOURCE，RAM需求43,658,429,376 > 可用29,781,790,720 bytes，GPU整模不合格 | 先合格资源或审查低内存策略，不强行加载/终止其他进程 |

初始CJS import、GPU/EOS、exec02可选undefined oracle、CPU-mask/stdout adapter、首oracle旧表名错误均保留。最终独立oracle要求当前v13组织表存在；修正harness不删除旧FAIL、降低断言或放宽产品门槛。

## 未运行/后续队列

| 项目 | 当前状态 | 未覆盖范围 |
| --- | --- | --- |
| Desktop/原生 | 本轮NOT_RUN，等待用户后续批准 | safeStorage重启/锁定恢复、原生账号取消/退出/焦点、工作窗口/跨应用交接 |
| 历史Esc/窗口阻塞、整体第三项复测 | 历史BLOCKED_UX_ACCEPTANCE；本轮整体USER_EXCLUDED | 没有自动桌面回退或完整UX验收 |
| Browser完整焦点/快捷键/缩放/长内容、账号撤销 | 完整矩阵NOT_RUN | 最新1366×768新增控件/Tab/取消及Main重启后low读回PASS，只覆盖限定路径 |
| 其他真实reasoning档位/任务 | NOT_RUN_REAL_MODEL | 六档SDK payload通过，真实仅low probe/单图；云端标签/反推/细化质量未新增调用 |
| H22 gallery parity/golden | 历史FAIL/STALE，1.097186% > 0.5% | 不调阈值或替参考求绿 |
| H02/03 open/recovery、H04/05 download/storage | 本轮NOT_RUN | 无本轮下载/恢复，旧Windows blanket不是当前拒绝原因 |
| H06/07/15/21全部AI/provider | 完整矩阵NOT_RUN | 仅两张Luna、六张Qwen和一次标签，不泛化全部Provider/能力 |
| H11完整tag recovery、H14真实OCR观察 | 完整路径NOT_RUN | 单次tag持久化/普通reopen不替代恢复/真实OCR推理 |
| H17正式模型Workspace/Runtime Package | NOT_RUN | 已授权权重tracer不等于安装/激活/产品管理交付 |
| H18全部auth/ACL、H20 motion | 完整矩阵NOT_RUN | 本轮限定订阅已授权且通过，不能沿用“真实账号未授权”旧描述 |
| 原EBUSY owner/timing | UNKNOWN | 本轮归零不追溯证明旧owner根因 |
| kernel/CNG close fault、断电、restore | NOT_RUN / restore=false | 合成/receipt/备份不替代物理证明 |
| 私人旧库、安装包/macOS、大库/恶意同principal | NOT_RUN | 公开图新库及≤1MiB/growth4MiB资格不覆盖；B2/86非本轮实施 |

H01 local transitions4/4与旧H19 Pi runtime5/5为历史日期证据；最新Pi协议5/5及完整封印拒绝17/17另列。最早11770 bytes完整队列在[历史快照](../history/handoff-snapshots/WC01-FAILURE-QUEUE-20261003-before-wc01-close-12.md)，SHA5184b3beaa3d23c0affc0eb6ec8a2781206ab0e9303ce8c1e7bdcc0d45df5081；case/test/log仍在`.scratch/wc01-20261003/failure-queue.json`。本轮前队列原件在reasoning run/before，旧真实模型状态不重写。本轮库关闭、helper停止、Main会话保留；完成STOP，不自动清理/下载/下一批/桌面验证。
