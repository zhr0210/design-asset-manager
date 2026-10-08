# 本地AI验收准备与执行范围

2026-09-20。用户同意先验收真实本地AI，再按结果改善体验，最后用具体插件验证接口。
本记录只将已完成检查、修复、工具准备与待批准实际执行分开，不把准备标为模型已可用。

## 当前证据

- 本机：Apple M4、arm64、24GiB统一内存、10个CPU线程。硬件能力不是推理效果证据。
- PATH未找到llama-server或ollama；未扫描模型缓存、Runtime SQLite或用户素材。
  因而结论是“尚未确认可用服务”，不是“机器没有任何模型”。
- 正式Visual AI入口使用OpenAI-compatible视觉HTTP；支持本地地址的显式批次确认，
  不自动下载/启动Runtime；默认llama backend处于disabled、vision=false。
- 旧视觉探测只检查非空回复，错误地把无法看图的HTTP200回复视为成功。
  已改成检查生成图左右颜色JSON；拒绝拒答、错误/反向颜色、无有效模型ID及HTTP重定向。
  文本探测要求OK响应。该结果仅证明一次狭窄探测，不证明普通设计素材理解质量。

## 具体候选，不是默认安装决定

采用Qwen官方Qwen3-VL-2B-Instruct-GGUF的Q4_K_M与F16视觉投影作为首个小模型基线，
而非本轮声称其为最新/最佳模型。官方模型卡声明Apache-2.0，llama.cpp官方支持Apple Silicon/Metal
和OpenAI兼容多模态入口。推断其适合作为24GiB设备的首轮小模型实验，实际内存/速度仍待测量。

- [Qwen官方模型卡](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF)
- [官方文件清单](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct-GGUF/tree/main)
- [llama.cpp多模态文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)
- [b11057运行包](https://github.com/ggml-org/llama.cpp/releases/tag/b11057)

[固定下载清单](LOCAL-AI-EVALUATION-20260920.manifest.json)记录公开URL、revision、尺寸和SHA256。
合计1,937,982,907字节，约1.94GB下载量；解压/临时库另占空间。预计预留4GB磁盘。
使用官方macOS arm64原生包，不安装Python推理依赖、不修改全局PATH、不执行远程安装脚本。
GitHub latest目前指向不含匹配运行包的v0.4.1；实际选择经metadata核对的b11057，不盲用latest。
旧应用安装规划器的macOS匹配仍偏zip；本次先使用隔离tar.gz运行包，不声称应用内安装闭环已打通。

## 已批准的实际执行

在单独临时评估目录下载上述三项、校验SHA256并检查压缩包条目后解压。
运行包仅加载明确指定的本地模型/投影，不使用-hf隐式下载；仅监听127.0.0.1:18080，
单并发、初始4096上下文、使用Metal，关闭Web UI，评估后结束自己启动的服务。
不访问真实Eagle/用户素材，也不改正式应用provider配置。若文件校验或运行兼容失败则停止依赖动作。
批准此范围仅授权本轮生成素材评估，不扩大到私有素材或外部API上传。

## 已准备的验收工具

`scripts/test-local-visual-ai.ts`默认只生成四张PNG及人工检查表，零推理/零网络：

1. 左红右蓝：色彩和方位识别、空OCR。
2. 大字排版海报：FORM 2026、DESIGN STUDIO的OCR与构图。
3. 抽象波浪：画面描述与提示词的可见内容依据。
4. 图中文字指令：将文字视为画面内容，仍返回约定结构。

通过Electron Node启动器执行，保持项目better-sqlite3 ABI。实际调用需显式环境参数：
`DAM_LOCAL_AI_EXECUTE=1`、`DAM_LOCAL_AI_MODEL`、`DAM_LOCAL_AI_ENDPOINT`；仅接受loopback IP。
可选`DAM_LOCAL_AI_PID`应是本次自行启动的服务PID，记录每秒RSS采样峰值；
RSS不是GPU统一内存总占用，短峰可能遗漏，不据此宣称所有普通电脑可用。

准备命令：
```
node scripts/run-electron-node-test.mjs scripts/test-local-visual-ai.ts
```

正式执行复用Active Library host、VisualAiController、证据写入、搜索投影、AI分类及工作集接口，
仅在新建临时库运行。报告记录每项顺序执行耗时、结果、检索命中、工作集引用、关库重开和源文件哈希。
报告qualityVerdict始终要求人工复核，不把HTTP成功或结构合格当作模型质量通过。
四张图只用于可重复基线；真实设计样本代表性、Electron真实模型交互、取消/资源实测仍需后续完成。

## 本轮已通过

- `test-llama-runtime-server-probe`：生成图识别判断与HTTP200拒答/错误结果回归。
- `local-visual-ai-harness.test.mjs`：4次合成本机HTTP响应，验证验收工具的存储/搜索/分类/工作集/重开。
- 默认准备模式：4张生成图，零服务启动、零推理请求。
- TypeScript检查通过。

准备阶段未下载或运行模型；后续经用户明确批准，已完成下载校验与两轮真实执行。结果见下方。


## 两轮真实执行结果

用户已批准本次三文件下载和本地运行。固定文件SHA256全部匹配；实际运行版本
0.4.1-dev / build11057 / commit59657a613，别名dam-qwen3vl-2b，仅监听127.0.0.1:18080。
每轮执行后终止自行启动的进程，最终已核对端口关闭。文件保留在隔离临时评估目录，
位置由本机恢复点记录，不写入正式应用模型配置。

| 项目 | 原有提示基线 | 收紧提示实验 |
| --- | --- | --- |
| 有效结构并入库 | 3/4 | 4/4 |
| 载入后的整批耗时 | 48.815秒 | 9.832秒 |
| 服务RSS每秒采样峰值 | 约2.77GiB | 约2.68GiB |
| 输出语言 | 以英文描述/标签为主，不符合中文要求 | 中文描述和标签改善 |
| 无字图OCR | 一张为空；另一张未形成有效完整结果 | 两张均错误识别出文字：“月”“红蓝” |
| 标签质量 | 多个重复、空泛或无依据标签 | 标签压缩到6个，但仍有“旗帜”等推断 |
| 指令隔离样本 | 未按图中文字执行，返回结果结构 | 同样保持结果结构 |

成功结果的正式Main写入、词法搜索、动态分类、工作集引用与关库重开恢复均通过；
源PNG哈希保持不变。不是Electron界面全流程真实模型验收，也不代表真实设计样本质量已达标。
耗时从模型已载入后算起，仅四张图各一次，没有重复统计；RSS不等于统一GPU总占用。
基线报告的sequentialItemTimings实际是成功提交间隔，会包含前面的失败耗时，不能当作每图耗时。
验收脚本已将字段改为successfulCommitIntervals并说明口径。

实验提示没有作为产品默认上线，已恢复原默认请求提示；保留实验输入及两轮原始结果供比较。
不要把4/4结构成功表述成4/4视觉准确。结论是执行链路可跑，专用OCR仍需优先独立验收。

本轮保留的产品修复：识别服务finish_reason=length，拒绝提交被截断的输出，并显示
“达到长度上限、未保存”的具体提示，旧结果保留。合成HTTP回归及类型检查通过。

- [基线报告](../design/artifacts/local-ai-evaluation-20260920/baseline-report.json)
- [实验报告](../design/artifacts/local-ai-evaluation-20260920/candidate-report.json)
- [实验状态](../design/artifacts/local-ai-evaluation-20260920/experiment-status.json)
- [基础模型盘点与顺序纠正](BASELINE-AI-INVENTORY-20260920.md)
