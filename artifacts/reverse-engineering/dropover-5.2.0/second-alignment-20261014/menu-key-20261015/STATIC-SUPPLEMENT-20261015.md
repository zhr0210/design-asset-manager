# 菜单剩余机制静态补证

本轮 reverse-engineer-anything 子任务只读核对已安装 Dropover 5.2.0 (653)，没有新物理执行，也没有改库/系统设置。REA session 无开放目标、Ghidra 未配置进程路径，以下取自实际安装资源、Swift 类型描述符及 arm64 汇编，不伪造 REA Evidence ID。

文件：`/Applications/Dropover.app/Contents/Frameworks/DropoverFileOperations.framework/Versions/A/DropoverFileOperations`。Universal SHA256 `8bb77e4cf1cd85f0b5564405572a9d911b3e442b6a54e33c11b7ea2697c2bfa7`。
资源：同框架 `Resources/en.lproj/DropoverFileOperations.strings`，SHA256 `4b717f24c0df3b8a10ad98d77e1f64b2a26498c025d189869a0947a2105848ca`。

| 范围 | 直接静态观察 | 不能据此宣称 |
| --- | --- | --- |
| PDF | 0x467bc逐URL载入NSImage；0x467e8调用PDFPage.initWithImage并逐项追加，配置0x13da38只有destinationDirectory/revealAction | 多图实际页顺序/异常格式通过 |
| 拼接 | 0x85d58按单图高度递减y；0x85d7c为(总宽−图宽)×0.5；0x85dc8绘制；配置0x13da60只有outputDirectory/revealAction | 可调方向/间距/背景是原版功能 |
| OCR | 0xbedc8创建VNRecognizeTextRequest；0xbedf0 recognitionLevel=0；0xc0e14读取Orientation；0xbf1cc执行；配置0x13daf4 textDestination/keepsSourceShelfOpen/outputDirectory | 实际有字/空字/部分失败已验；原版可选语言/模型 |
| 遮挡 | AnnotationMode0x13ff70为smartTextRedact/manualRedact；AutomaticTextAnnotationController0x14120c含字词选择/点击/拖选；Annotation0x140868只有location/color；ImageRedactExportScheme0x14084c image/annotations；原生ColorWell及副本/覆盖、Finder/架子输出文案 | 新增文字排版是原版；AnnotationType0x13e1c8的highlight/redact/blur一定均有可发现按钮 |
| 元数据 | 0x5b960源属性；0x5ba30 kCFNull改写属性字典；0x5be7c CGImageDestinationAddImageFromSource；0x5bea4 finalize，关联remove-image-metadata输出目录键 | 完整保留名单、方向/ICC/像素字节不变已证实 |
| 压缩 | 已有真实配置为质量80、创建副本、仅JPG/BMP且其他忽略；包有JPG/HEIC/OptiPNG compressor及unsupportedFormat | PNG菜单支持，真实压缩收益/取消已验 |

DAM默认PDF逐图一页、拼接原尺寸纵向居中；横向/等比/间距是显式可选扩展。遮挡核心采用手动选区与消费DAM真实本机OCR多边形的智能选区，保留独立副本保护，不复制原版覆盖原件能力。DAM既有RapidOCR不冒称Vision。原版不支持格式的静默忽略不沿用。

旧 REPORT.md 指向的部分 evidence/content 文件在当前树不存在；没有将旧地址记录当作本轮已读取证据。具体完整工具、输出、取消及多图运行边界仍需物理补验。
