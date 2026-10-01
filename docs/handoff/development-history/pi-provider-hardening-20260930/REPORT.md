# DAM Pi Provider准入与认证契约收尾报告

日期2026-09-30。用户“按照包内规划提示继续”批准评审包的限定实施。已按顺序完成准入限制、实际固定SDK离线契约、窄登录交互、受影响回归、资源基准与独立复核。交付为COMPLETED_RESTRICTED_SCOPE / STOP：安全可用边界和隔离契约完成，OpenAI注册/JWT及真实受控OAuth网络仍未实现，没有宣称所有订阅已接通。

## 本次变更

共享provider-policy.json由Main与Worker共同使用，分开SDK支持、产品许可及可执行动作。OpenAI-compatible、OpenAI API Key、Anthropic API Key保留；Google原生图片推理、订阅登录/刷新及Copilot推理明确不可执行。模型目录为静态事实而非服务健康。普通保存不升级资格，界面显示“已保存凭据”。切换Legacy不能使订阅连接变成可执行。

Main懒加载持有安装级随机UUID，不取硬件标识、不经Renderer配置/导出；固定SDK缺ID/错ID真实入口拒绝得到验证。固定OpenAI新OAuth仍缺当前应用名、注册复用和完整ID token验证，因此保持关闭，未下载或升级Pi。

新增text/secret/manual_code/select鉴别契约，有界选项id/label，Worker与Main分别检查；答案只能投给当前operation/prompt的合法选项。取消、已回答、A-B-A迟到及到期答案拒绝。生产默认且最大五分钟；内部20ms期限仅用于过期回归，未接入Renderer或环境。取消不改写已有终态。

实际固定Codex SDK首个选择项经过Worker/Main/React展示，browser/device两分支均在替代网络下贯通；错state不请求令牌、旧revision保留。此测试使用只在内部构造/生成bootstrap存在的放行，生产入口仍关闭认证网络，假令牌成功不证明真实身份资格。

Anthropic订阅产品入口禁用，保留API与旧数据；另补SDK会把已知订阅令牌按OAuth发送的识别分支拒绝：专用保存、显式迁移、凭据使用和Worker均拒绝，不自动删除。Copilot实际SDK在合成设备/目录响应下确会条件POST模型policy；生产对应动作在读取凭据/SDK/网络前阻断，没有账号策略写入许可。推理fetch治理未冒充认证治理。

完整Provider × 认证 × 动作矩阵见source-snapshot/src/main/ai-gateway/PROVIDER-MATRIX.md或仓库同文件。Legacy/视觉/独立标签的Host权威写入、人工保护和单一业务重试保持。

## 与包内发现逐项对账

| 发现 | 实际结果 | 剩余边界 |
| --- | --- | --- |
| F01 Google fetch冲突 | 固定Node24.21/实际SDK复现，Main/Worker/UI清楚不可用 | 未实现Google受控原生传输，没有删fetch保护 |
| F02 OpenAI登录 | stable hostID与真实缺失/错误ID测试完成 | 注册、client复用、ID token/nonce/账号身份验证未实现；产品禁用 |
| F03 Codex选择项 | 有界契约、合法答案、实际SDK Worker/Main/React两分支及取消/到期完成 | 真实账号和认证网络未开放 |
| F04 Anthropic订阅 | UI/Main产品限制，SDK已知订阅令牌不能伪装API key使用，旧记录保留 | API Key真实服务仍NOT_RUN |
| F05 Copilot策略写入 | 实际SDK合成条件分支复现；正式准入无账号写入 | 不开放登录/推理，未对真实账号操作 |
| F06认证网络 | 推理、目录、认证、刷新与policy写入分别列矩阵；未闭合动作先拒绝 | 没有实现所有认证网络的受控传输 |
| OBS01校验成本 | 基准与实际spawn=0取消测试，未缓存/删保护 | OS真正冷盘、Windows与内存峰值未测 |

## 证据

最终聚焦Provider/认证矩阵45项：Main准入8、SDK前置3、实际原生SDK17、Codex Worker/Main/React4、Copilot条件分支1、prompt/身份/到期5、React5、校验基准2，全部通过。这里含已有React回归，不把45全部称为新增，也不把SDK预期拒绝称为模型可用。

相关回归125项：凭据14、OAuth生命周期9、真实临时Host7、资源布局2、实际兼容Worker5、正式Electron1、旧认证目录1、标签执行30、批次12、恢复22、资源准入10、OCR Controller12，全部通过；typecheck/build通过。独立最终30项全部通过。EVIDENCE-MAP逐命令记录退出码、超时、测试数量、日志SHA；历史重复不累加到有效计数。

所有模型响应与令牌均为合成；替代网络可以mock，正在验证的实际SDK入口没有替换。没有访问真实账号/Keychain/资料库、启动真实模型、调用付费API、下载依赖/权重、升级版本或发布。正式Electron使用隔离profile/生成素材/自有服务；其他真实平台NOT_RUN。

早期失败保留：两次新增prompt夹具少闭合括号；Native测试夹具最初未模拟完整Responses SSE、Request方法/body和Anthropic beta query；Copilot假model ID不在实际目录，未触发预期分支；一次OCR入口文件名错误。修复源于实际SDK/文件证据，未跳过或降低验收。没有超时记录被改成PASS。

## 运行时基准与影响

Main Electron Node20.16、macOS arm64，最终封印11829普通文件/2登记链接，每轮读取190545420 bytes。最终同一fresh runner首次/重复样本约1125/1050/1097ms；较早观测有约2873ms首轮。OS缓存未控制，真正disk-cold NOT_RUN。10ms取消请求约9.5ms观测结束，实际spawn spy=0、active/unknown=0。没有缓存、常驻进程或整体Runtime平台重构，不以此保证所有机器时延。

Pi/Node版本仍0.99.1/24.21.0；原依赖普通文件与inventory逐项复核未变，新增policy/交互模块才重新封印。新模块纳入extraResources。原Electron/SQLite ABI没有重编。

## 交接与停止

CURRENT源码而非旧Remote候选；没有套旧补丁、修改OCR许可或资料库schema。2741份开始基线保护，修改目标有before，完整结果见WORKSPACE-PROTECTION；没有暂存/提交/推送/恢复index或发布。源码包包含现有WIP相关调用方，不是完整仓库或签名安装程序，不含Node大二进制/node_modules/真实数据。

先读FINAL-HANDOFF.json → 本报告 → REVIEW-FINAL → EVIDENCE-MAP → PROVIDER-MATRIX。应用补丁前核对before SHA，不覆盖接收工程师修改；最小补丁在独立临时目录重建验证after SHA。旧批原报告不改写，最新入口说明本批限制。

下一轮如需开放订阅，先批准具体注册/身份/受控网络适配方案；若要升级SDK/依赖需新增范围。真实模型/API/订阅验收仍须指定账号、生成输入、目的地、费用及调用上限。nextBatchAuthorized=false，不自动续旧队列。

官方规则核验日期2026-09-30：[Anthropic认证说明](https://code.claude.com/docs/en/legal-and-compliance)、[OpenAI Docs注册与登录](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)。第三方文档不是任务授权，SDK支持不是产品许可。
