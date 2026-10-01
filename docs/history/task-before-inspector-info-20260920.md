# Current Task

## 已完成：专用OCR真实验证与新素材库闭环（2026-09-20）

用户明确批准本轮112.8MB下载、隔离安装及生成图本地执行。17项wheel全部SHA256匹配，
RapidOCR1.4.4/ONNX Runtime1.19.2在独立Python环境运行，未改变系统Python、用户模型缓存或真实Eagle库。

实测11张生成图（中英/混排/旋转/低对比/小字/无字/文字指令）归一化后11/11匹配，
3张无字图无误报。空格有丢失，不能称原文排版逐字准确；首次27.099秒，后续0.847–1.229秒。
仅为本机生成样本证据，复杂真实设计素材、Windows和打包部署未验收。

正式接线：asset-ocr窄IPC、Main持有连接写入、独立v8证据/修订、合法空结果优先于VLM文字推测。
首次成功保存先披露并确认v8兼容影响；只读/取消/失败不升级。不改旧全局Worker/数据库通道。
支持选择已安装可信OCR环境、批次确认/进度/取消、复制/修订/恢复原识别、草稿保护和OCR搜索。
再次识别保留用户修订；旧会话/过期任务/变化的预览/错误模型摘要不能提交。
已提交OCR随同预览回收站恢复保留；回收前的晚到任务仍按生命周期版本拒绝。

验收：14环节真实模型Electron流程、独立OCR契约/进程/存储/取消/冲突测试、工作集/组织/笔记回归，
205个invoke注册检查、类型/构建/token检查。共享Gallery15组几何/材料检查通过。
Context检查通过但11个未跟踪源码未纳入ownership覆盖，未做全源码覆盖声明。
最终正式报告 dam-library-canvas-e2e-a8IjPf；隔离预览jaw4al（5个生成素材）保持打开，未刷新用户原窗口。
保留会话执行工具session 7544为预览宿主；各OCR Python进程按次执行后退出，没有常驻推理服务。

[执行说明与完整证据](docs/product/RAPIDOCR-EVALUATION-20260920.md)
[ADR0490](docs/adr/0490-dedicated-ocr-preserves-empty-results-and-user-corrections.md)
下一请求可推进描述/标签模型，但本轮不自动进入下一模型或插件队列。
应用内自动下载安装尚未做，目前通过主进程本地目录选择器选择已安装且可信的OCR环境。

恢复点：`/tmp/dam-approved-ocr-evaluation-state.json`（隔离运行环境），`/tmp/dam-ocr-fixtures-state.json`（生成样本）；
源码前快照 `/tmp/dam-ocr-integration-state.json`。已有暂存/无关改动保留，未提交。
