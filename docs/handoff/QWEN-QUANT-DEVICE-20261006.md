# Qwen3-VL 量化选择与设备资源联动（2026-10-06）

状态：此前五项功能选择保持。用户随后要求参考ComfyUI/Stable Diffusion及llama等成熟工程重设计底层；Q7–Q12资源约束保持，Q15–Q17增加中文/语义/以图检索设计及已验证模型离线使用。本文件的资源策略与连续实施次序以 [新版底座设计](../product/LOCAL-AI-RESOURCE-COORDINATION.md) 为准，源码与采用边界见 [工程参考](../product/AI-ENGINEERING-REFERENCE-20261006.md)；新版整体共享理解待确认。尚未修改产品代码或将量化版本标为可用。此前B完成范围及证据保留。

## 已确认的用户结果

- 完成正式“设备推荐 → 用户选择 → 下载安装 → 真实验证 → 素材分析 → 保存重开”，交付不止目录。
- Hugging Face 官方优先；缺失量化级别可由明确标识、核对许可和来源的社区仓库补充。固定提交与逐文件校验，不执行模型仓库代码。
- 默认平衡，用户可切换省资源/较高质量偏好。推荐解释使用的设备资源与估计依据，不以参数量保证任务质量。
- 下载目录覆盖全部Qwen3-VL生成模型规模与Instruct/Thinking形式；首轮正式运行覆盖2B/4B/8B Instruct GGUF，其他规模、Thinking、FP8显示真实链接和支持状态。
- 用户可以选择GPU完整、混合或纯CPU加载；后续Q8已授权在同一模型/量化内于新单位前自动采用已验证的加载方案，实际方式和代价可见。执行计划冻结，加载前重新检查资源，不向云服务自动替代。

术语复用 CONTEXT 的 Qwen3-VL Candidate、MMProj Model、Hardware Variant Recommendation、Local AI Setup Preference Profile、Plan Estimate Evidence 与 Local AI Resource Governor。新增 Hugging Face Model Bundle，明确语言权重分片与必需视觉投影一起形成组合，来源证明与 DAM 发布者签名分开。

## 当前真实缺口

正式 `ai-resources:read/configure → visualAdmission.resourceStatus()` 已有 RAM 总量/空闲量、采样时间、共享许可与压力；没有显存字段。后台 `gpuFree` 为 unknown。当前本地消费者是 2B/4B CPU float32；GGUF 目录仍 catalog-only。旧 llama IPC 全部禁用，旧安装器按总显存选模型、固定端口并提前声称释放，不能直接启用为正式生命周期。

本机只读观测：2026-10-06 22:08:04（北京时间），RAM 总63.72GiB、可用30.33GiB；22:08:13，RTX5060Ti 总16311MiB、空闲9869MiB、已用6182MiB。GPU来源是已核对微软硬件兼容签名的System32 nvidia-smi，仅有界字段查询。观测是瞬时事实，不是应用正式采样、模型资格或后续可用资源保证。

正式接口应由唯一Host提供带来源/时间/known或unknown的RAM与各GPU数据；推荐读取该快照，加载前共享账本再检查。预算计入语言权重、投影、KV、视觉/计算缓冲、加载峰值、并发和为其他应用保留的余量；仓库全部文件合计、总显存或空闲量都不能单独替代运行预算。推荐不自动下载安装或替换当前模型。

## 已核对的上游事实

[Qwen作者公开列表](https://huggingface.co/api/models?author=Qwen&search=Qwen3-VL&limit=100&full=true)本次40仓库中有36生成模型仓库：2B/4B/8B/32B dense、30B-A3B/235B-A22B MoE，各有Instruct/Thinking及原版/FP8/GGUF。另四个Embedding/Reranker属于不同任务。MoE激活参数不代表只需加载该规模权重。

12个官方GGUF仓库均提供语言F16/Q4_K_M/Q8_0与视觉F16/Q8_0，不覆盖Q2/Q3/Q5/Q6/IQ。组合必须包含同模型版本的全部语言分片及一个匹配投影；同一检查点允许语言/视觉使用不同精度。

| 官方Instruct GGUF | Q4_K_M语言 bytes | Q8_0投影 bytes | 固定提交 |
| --- | ---: | ---: | --- |
| 2B | 1107409952 | 445053216 | 52d6c8ffea26cc873ac5ad116f8631268d7eb503 |
| 4B | 2497281664 | 453974304 | 1cd86afb9a95c410a6038ab3b40d8b578c892266 |
| 8B | 5027784800 | 752289728 | f982a07559d4a2f6c8744d840bf6fccab30eea96 |

[2B语言Q4下载](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/52d6c8ffea26cc873ac5ad116f8631268d7eb503/Qwen3VL-2B-Instruct-Q4_K_M.gguf)及[匹配Q8投影](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/resolve/52d6c8ffea26cc873ac5ad116f8631268d7eb503/mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf)约1.446GiB磁盘权重；实际运行预算仍需上述开销。语言SHA `089d75c52f4b7ffc56ba998ffc50aae89fcafc755f9e7208aacca281dca6c2ae`，投影SHA `f9a68fabba69c3b81e153367b2c7521030b0fa8bb0de400c9599c8e6725f9c82`。

社区候选[unsloth/Qwen3-VL-4B-Instruct-GGUF](https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF)本次提交`00c00da0690c4b14b5539b02c4ea5d7c9102b35e`，Apache-2.0且指向官方base_model，包含26语言备选及视觉投影。Bartowski同类仓库此次license字段为空，需再核对；其中imatrix.gguf不能误列为可运行语言权重。这里仅记录公开事实，未授予实际安装/运行资格。

[llama.cpp多模态文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)要求支持libmtmd且明确绑定语言文件和mmproj；CPU/CUDA/Vulkan是不同构建资格。官方卡片的历史b6907不能直接当本轮已验证版本。[视觉位置插值修复](https://github.com/ggml-org/llama.cpp/commit/b4aa7dd477acf065a3b9c6a8cf324c904da1a834)及持续变化要求选定、哈希核对并真实测试运行包。今日latest release仅nightly-tag.txt，不能假设latest一定有安装二进制。有限context/图像token/并发与KV设置必须显式绑定；不能采用原生262144 context默认并按权重大小推荐。

## 具体交互与执行边界

用户从现有“AI与模型 → 本地模型与OCR”进入，先看到当前可用RAM、每张GPU的总/空闲显存、采样时间，以及DAM预留后的运行预算。显示默认平衡的推荐组合和选择理由，允许切换偏好、模型规模/量化级别与加载方式。每个组合清楚列出语言权重和视觉投影的精度、来源、组合下载量、预计RAM/VRAM、运行支持状态及已测或估计标签。

推荐卡上的正式动作依次为“核对并安装 → 下载与完整核验 → 验证并使用 → 返回素材分析”；已安装的组合直接进入真实验证。取消、暂停、退出后重开与明确恢复沿用正式库存和传输语义。清晰区分目录可下载、设备预算预计适合、运行时支持和真实验证已通过，前者不替代后者。

设备状态改变刷新推荐与准入说明，不自行下载、更换检查点/量化或覆盖当前模型。加载及新执行前再查当前设备与共享账本；Q8允许在同模型/精度的已验证集合内调节加载方式，实际计划可见，资源不足保留配置与结果并说明缺口。缺显存信息保持unknown；非支持加速后端不能因有显存而标为可用。

## 实施切片

1. **真实组合目录**：扩展现有HF发现；官方优先、许可明确的社区补充，按检查点/语言量化/匹配视觉投影聚合。保留固定提交、所有分片和SHA；排除imatrix等辅助数据充当语言模型。组合下载量只合计实际选择的文件。原始文件链接仍可查看。
2. **设备与预算联动**：在现有Host资源接口内增加有界、带时间与来源的各GPU采样；沿用RAM与占用账本。独立RAM/VRAM预算计入已驻留/未退出模型、准备/计算、有限任务context、图像与KV缓冲和预留。推荐、加载和计算使用相同预算语义；不把多张卡显存简单相加。
3. **受管GGUF正式执行**：复用库存/传输/信任与A资源生命周期，补一个固定受测llama.cpp运行包及私有自有进程适配。明确CUDA/CPU等构建资格、有限context/图像/并发、匹配mmproj和offload计划。候选真实图像验证通过后才更新当前连接与任务默认；取消/停用等实际进程退出后释放预算。旧llama全平台IPC和安装器不整套恢复。
4. **推荐与选择界面**：同一页面展示“推荐/可选慢速/预算不足/尚不支持/需要验证”和原因、差额、来源及估计标签；完成安装、验证、使用与回读，保持既有CPU、OCR和云连接的独立能力。

这四项是同一用户结果的连续切片，不要求逐文件、逐IPC或逐切片再问“继续”。新增内部接口/schema/依赖可在既有授权内调整；不扩大账号秘密、私人资料、系统权限或对外发布范围。

## 必需验收与保护

- 聚焦回归：上游角色与分片配对、许可/提交变化、失效资源与未知显存、独立RAM/VRAM预算、CPU/GPU/混合方案、加载前资源变化、旧候选/晚响应/取消和真实退出。
- 普通打包Host＋浏览器可见入口：刷新真实HF目录，查看本机设备与推荐，下载安装一个正式GGUF组合，真实验证并在既有公开coffee/astronaut素材执行分析。正常退出后重开，从UI找回组合、默认选择和已保存结果。
- 在已指定真实公开库/资料、现有模型与免费公开上游范围内持续验证。GPU分支用本机真实显卡；CPU与混合分支使用同一正式执行入口。预算不足、unsupported或unknown不伪造通过，不为测试强行加载大模型。
- 保存版本/运行包/组合/设备绑定与可观测RAM/VRAM、加载/退出时间。费用、质量、速度或GPU归属测量拿不到就标未知或估计，不能填写固定verified对象。
- 保护原件、人工描述/确认标签、OCR修订、既有运行与后台许可语义；重开不自动重发未知记录。当前B的公开副本与原index保持，不stage/commit/push。

## 共享理解确认

此前Q6整体确认已由用户后续资源底层重设计请求替代。现在等待 [新资源设计](../product/LOCAL-AI-RESOURCE-COORDINATION.md) 的整体共享理解确认，这是本轮指定grilling要求。当前仅完成调研、设计记录与术语，量化执行和设备协同的产品结果仍未完成。确认后连续实施；所有必需用户路径成立后关闭本轮，停止于本目标，不扩C–F。
