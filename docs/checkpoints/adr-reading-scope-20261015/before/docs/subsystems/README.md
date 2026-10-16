# 功能与子系统目录

这里按功能协作关系组织当前软件；一个子系统可以跨Host、Shared Client、Renderer、原生helper或Worker，不按一个文件夹等于一个完整功能。先选相关专题，再跟源码核对。有效目标、实际实现和运行资格分别维护。

| 功能/子系统 | 相关任务路由 | 实现定位线索 |
| --- | --- | --- |
| [应用、双客户端与生命周期](local-host.md) | desktop-shell | src/main/index.ts、src/main/local-host |
| [资料库、持锁与维护](library-lifecycle.md) | asset-lifecycle, library-creation | src/main/active-library-runtime.ts、src/main/library-lifecycle |
| [原件、Copy入库与派生文件](storage-intake.md) | capture-intake, source-discovery | src/main/capture-intake、src/main/capture-intake |
| [素材工作台、详情与共享展示](asset-workspace.md) | asset-workspace | src/renderer/routes、src/renderer/components |
| [组织、标签、笔记与人工内容](organization.md) | asset-workspace, asset-lifecycle | src/main/library-lifecycle、src/main/library-lifecycle |
| [文字、颜色、语义与图像检索](asset-discovery.md) | asset-discovery | src/renderer/components、src/main/asset-search |
| [基础分析、独立标签与后台任务](ai-analysis.md) | ai-analysis | src/main/background-analysis、src/main/independent-tags |
| [OCR执行、空结果与修正](ocr.md) | ai-analysis, ai-runtime | src/main/ocr、src/main/background-ocr |
| [深度分析、提示词反推与图片工具](visual-ai.md) | prompt-reverse, ai-analysis | src/main/visual-ai、src/main/visual-ai |
| [AI连接、账号与Pi协议](ai-connections.md) | prompt-reverse, ai-runtime | src/main/ai-gateway、src/main/ai-gateway |
| [模型制品、正式库存与签名目录](model-library.md) | model-library, model-library-core, model-storage-root-registry, model-library-product-pilot, official-model-catalog-release | src/main/model-library-workspace、src/main/model-library-workspace |
| [执行Runtime、资源与物理退出](ai-runtime.md) | ai-runtime, runtime-package | src/main/services、src/main/services |
| [工作集、macOS原生悬浮窗与预览](work-mode.md) | work-mode, desktop-shell | src/main/work-mode、src/main/work-mode |
| [视频参考帧与跨应用文件交付](media-handoff.md) | work-mode | src/main/work-mode、src/main/work-mode |
| [设置、路径、诊断与旧库找回](settings-recovery.md) | settings-paths, desktop-shell | src/renderer/routes、src/main/services |
| [平台、构建资源、安装与发行](platform-release.md) | release-packaging, official-model-catalog-release | src/main/platform、src/main/packaging |
| [工程导航、规范、审查与反馈](engineering.md) | agent-governance | AGENTS.md、CONTRIBUTING.md |
| [有效目标、可选能力与退休范围](optional-targets.md) | source-discovery | docs/product/PRODUCT-FOUNDATION.md、docs/adr/README.md |

## 怎样维护

正文解释职责/边界、状态权威、主运行链、状态转换、重要约束、失败/取消/兼容及验证。引用源码文件和符号，不逐页复制易漂移版本号；复杂系统可充分展开，不按字数切碎。

改变以上契约时同任务更新唯一拥有者；行为保持的内部重构可说明不需正文变更的依据。当前机制归本目录/模块README，用户契约与目标归产品/交互规格，视觉只归DESIGN，实际资格归CURRENT-STATE，历史结果归报告。目录不维护第二份产品进度。

## 怎样说明与审查语义变更

1. 写具体触发条件和前后可观察行为，标明受影响子系统。
2. 对照base和候选源码，沿实际调用者、状态/权限、平台/适配器和副作用追踪，不能只看改动行。
3. 契约有变化就更新所属正文，核对来源与引用；未变说明依据。
4. 核对测试/运行证据确实覆盖声称行为，列出未运行/缺口。文档存在不证明兼容或功能完成。

机器导航与验证候选复用.codeindex。旧[implementation-status](../agents/implementation-status.md)仅为兼容入口；任务读取/写回由[AGENTS](../../AGENTS.md)直接导航，维护方法见[CONTRIBUTING](../../CONTRIBUTING.md#7-文档维护)。
