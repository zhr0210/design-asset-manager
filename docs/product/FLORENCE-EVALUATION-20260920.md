# Florence-2 描述与对象标签验收方案

状态：用户于2026-09-23批准本清单下载、隔离安装与CPU/MPS测试；已完成固定文件校验和两设备真实推理。结论是「可在本机运行，尚不适合默认自动分析」，不代表旧Worker已恢复。

选取现有项目注册的Florence-2 Large能力进行评估，使用Transformers官方文档推荐的
`florence-community/Florence-2-large`原生格式转换版，固定revision：
`4271c66b88cdbc05735372ec13b2360108de5317`。
这不是宣称旧的Microsoft动态代码封装已恢复，旧Worker和全局数据库通道保持原状。

[固定清单](FLORENCE-EVALUATION-20260920.manifest.json)包含11个模型数据文件和25项PyPI wheel，
合计约1.68GB。大权重/wheel校验SHA256，小型模型配置/词表按固定revision与Git blob摘要核对。
使用safetensors与Transformers4.56.2内置Florence2ForConditionalGeneration，禁用remote code。
不下载或执行模型仓库的.py，不安装CUDA/FlashAttention，不修改系统Python或已验收OCR环境。

已批准的本次范围：下载清单文件，在独立临时Python3.9环境离线安装PyTorch2.8.0等依赖；
使用M4本地CPU及MPS各自显式运行，仅处理生成测试图，记录各自结果，不静默fallback。
模型与缓存限制在该临时环境；生成样本及报告已归档到项目以供复核。
不读取真实素材库，不发送图像至外部，不启动旧FastAPI队列。
预留约4GB磁盘；实际统一内存占用和速度以测量为准，不先宣称普通设备均适用。

## 实测结果（2026-09-23）

固定清单的11个模型文件和25项wheel共1,678,018,077字节，下载后逐文件重新校验通过。
25项依赖仅安装到独立临时Python3.9环境；未改系统Python、现有OCR环境或正式模型配置。
模型以`trust_remote_code=False`加载，权重加载报告没有缺失、意外或不匹配键。
测试仅用[六张生成图](evidence/florence-20260923/manifest.json)：杯子、盆栽、笔记本、三圆抽象图、纯白图和含指令字样的文字图。

| 本机设备 | 首轮三任务执行 | 模型加载¹ | 首轮单次推理中位数 | 进程峰值RSS | MPS驱动分配峰值 |
| --- | ---: | ---: | ---: | ---: | ---: |
| CPU | 18/18无运行错误 | 0.95秒 | 2.90秒 | 4.36 GiB | 不适用 |
| MPS | 18/18无运行错误 | 3.08秒 | 1.34秒 | 4.66 GiB | 4.25 GiB |

¹ 加载计时不含Python导入Torch的时间；推理中位数来自本机单次测试，不是跨设备性能承诺。MPS分配与进程RSS是不同口径，不能相加。没有任务触及256 token上限。

首轮对象检测虽未报运行错误，却全部被解析为空。诊断发现模型原文有目标与`<loc_*>`坐标，
当前Transformers解析器要求相邻定位token，模型却在token之间输出空格。评估器现在只为`<OD>`
合并相邻定位token之间的空白，再交给原生解析器；原文仍保存在生成样本报告里。
针对对象检测重新在CPU和MPS各运行6张图，12/12调用完成，两设备结果一致：
杯子识别为`mug`，盆栽为`flowerpot`/`houseplant`，笔记本为`laptop`；
纯白图无检测框。三圆抽象图被误判为4个`egg`，文字图被框为整页`poster`。
修复的是解析遗漏，不是模型识别质量。

短描述和详细描述对前三张具象图基本贴合，但全部输出英文；纯白图两项都臆测出笔记本，
详细描述还臆测手机壳、猫狗。含指令字样的图被作为可见文字描述，没有观察到任务被改写；
这只能说明该生成样本的表现，不能证明对任意不可信素材安全。抽象图描述为三圆韦恩图，
但对象标签明显错误。六张简化合成图不能代表真实摄影、复杂网页或设计稿的质量。

**验收判断：原生权重与CPU/MPS离线推理路径通过；默认自动描述/对象标签质量不通过。**
Florence目前仍是隔离评估工具，不接入正式分析队列，也不作为中文标签、检索或真实素材库的已交付能力。
后续若选择产品接线，需先评估真实设计素材、中文输出和误检抑制，并保留用户修订优先的既有规则。

证据：[CPU首轮](evidence/florence-20260923/florence-cpu.json)、[MPS首轮](evidence/florence-20260923/florence-mps.json)、
[CPU对象检测复核](evidence/florence-20260923/florence-od-verified-cpu.json)、[MPS对象检测复核](evidence/florence-20260923/florence-od-verified-mps.json)。
报告和对应PNG都只含生成夹具；保留首轮空解析结果，未用复核覆盖失败证据。

## 评估边界与复现

`ai-service/tools/evaluate_florence_local.py`默认review-only，不加载模型。
显式执行时只读本地模型和标为generatedOnly的夹具，禁用Hub下载与遥测、阻断Python连接，
不允许模拟推理。保留定位特殊token后解析结果，避免把对象定位token提前删除。
三项任务：短描述、详细描述、对象检测标签。每张最多256生成token，固定贪婪输出；
报告标记到达上限、失败与设备，成功返回仍需人工核对内容。

重点检查可见对象、颜色/位置、空白/抽象图的臆测、标签噪声、输出语言和设备耗时。
不把英文对象标签当作中文设计分类已交付；若需翻译或后续接线，再以实测结果决定。
专用OCR继续由RapidOCR承担，不用Florence是否支持OCR作为替代准确率证据。

依据：
- [Transformers Florence-2原生文档](https://huggingface.co/docs/transformers/en/model_doc/florence2)
- [固定版本文档](https://huggingface.co/docs/transformers/v4.56.2/model_doc/florence2)
- [原生格式模型卡](https://huggingface.co/florence-community/Florence-2-large)


## 可复现准备

- `node scripts/prepare-approved-florence-runtime.mjs`默认只显示范围；实际`--approved`安装仅在已收到本轮明确批准后执行。
- `node scripts/prepare-florence-fixtures.mjs`生成6个样本：杯子、盆栽、笔记本电脑、抽象构图、空白、图中文字指令。
  它们是简化合成图，不用来宣称真实照片或专业设计样本准确率。
- `evaluate_florence_local.py`显式接受上述临时夹具路径，使用短描述/详细描述/对象检测三项任务；
  模型定位token保留给解析器，空检测与解析失败分开，记录推理耗时、进程RSS和MPS驱动内存（若使用MPS）。
- 对象检测定向复核通过环境变量`DAM_FLORENCE_OD_ONLY=1`只运行`<OD>`，需要显式指定设备、模型目录、生成夹具与独立报告路径；默认仍运行三项任务。
- 固定25项依赖已在隔离环境实际安装并通过模型加载；不据此推断Windows或其他macOS硬件可用。
- 5项无模型契约测试通过：非空描述、定位token兼容、合法空对象检测、有效定位框、夹具路径限制。默认启动模型加载/网络次数均为0。
