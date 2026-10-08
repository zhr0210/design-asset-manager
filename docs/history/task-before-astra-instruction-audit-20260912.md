# Current Task

## 进行中：全应用重构与禁用能力恢复

用户已确认保留产品定位、功能目标和基础框架，并要求首轮恢复禁用功能；
前端以资料库、专注查看、悬浮卡片三模式及玻璃切换为方向。
本阶段已从原型进入正式 Main/Preload/Renderer 接线，整体重构尚未完成。

### 本阶段已接线（2026-09-12）

- 正式三模式与原生悬浮卡片保持；Main同步提示词/描述草稿、比较提交与窗口撤销。
- 六类设置及五个ai-backend配置/显式GET探测接口保持。配置不等于上传授权。
- Library Inspector及卡片接入视觉AI：确认服务/模型/1–8张受控预览后执行真实
  compatible HTTP请求；输出描述、OCR、标签建议、反推提示词。手工描述保护、
  标签接受、提示词追加、批次取消、陈旧结果拒绝和跨窗口刷新已实现。
- 新库仍v1，首次确认AI执行才增加v2证据表；精确schema检查与v2重开接通，
  UI披露旧应用不能打开v2。没有读取或升级真实用户库。
- 下载页、来源搜索与采集触发器接入直连PNG/JPEG/WebP下载确认、真实字节进度、
  取消/同会话重试与Capture入库；32MB、不带Cookie、不跟随重定向。成功后才刷新。
  部分Capture中断保留恢复记录并显示需要恢复，不允许盲目重试。

### 本轮继续重构：图片工具与资料库内部结构

- Library检查器、内嵌卡片及原生卡片新增可折叠图片工具：90度步进旋转、水平镜像、
  居中比例裁剪、最长边缩放，先看真实PNG预览，再明确保存为新素材。输入为受控
  预览（最长边1600），没有冒充原件分辨率编辑。来源图片、描述、标签不覆盖。
- 单次review绑定窗口、库与素材版本；新参数使旧preview失效，原生卡片仅能处理
  当前素材。副本保存来源身份/版本/操作记录，复用现有schema，无额外数据库升级。
- 新的owned-image-intake内部Module统一下载和图片副本的格式检查/staging/Capture；
  创建、bootstrap锁、精确schema校验、所有权回滚提取到library-materialization。
  Host由899行缩至646行，保留生命周期/held connection职责；不是全库体积优化声明。
- image-tools集成测试与完整Electron E2E通过，含实际像素、预览不入库、单次保存、
  来源不变、手工描述保护、拒绝其他素材/失效源、派生记录与重开。最新Electron
  证据根dam-active-library-electron-e2e-bCq8N6；UI smoke根dam-workspace-motion-q3uX14。
- 检查器工具合并进内部滚动区，移除旧“AI未启用”提示；主Library不再加载旧
  prompt/model hooks，减少无效调用。允许AI更新按钮明确说明保留当前描述到下次分析。
- Host、标签、IPC唯一注册（196 invoke）、Active IPC、shutdown、AI/download回归、
  typecheck与构建通过。完整原有功能与来源SHA后置条件保留。
- 没有访问真实素材/模型/Runtime，没有替换已安装应用；本轮由主Agent实现及自检。

### 本阶段验证

- visual-ai-download integration：生成图片、临时Active/App库、loopback HTTP；
  单次确认、窗口撤销、配置变化、真实传输、无效输出拒绝、取消、用户状态保护、
  标签幂等接受、下载取消/重试、部分Capture失败边界、来源不变和v2持久化。
- macOS合成Electron E2E：保留Copy/搜索/标签/Trash/Restore/草稿/设置与来源SHA
  后置条件；新增原生卡片确认、AI结果、标签跨窗刷新、追加提示词和下载确认入库。
  最终通过证据根 dam-active-library-electron-e2e-Qqby6N，含窄窗口拒绝其他素材验证。
- workspace-motion浏览器smoke通过，证据根 dam-workspace-motion-zwaBKV。
- Main IPC唯一注册（193 invoke）、活动库IPC、asset-card、库打开只读检查、
  下载store/状态、authority baseline、typecheck与构建通过。
- context:check、268项router评估、ADR/forbidden/docs-sync及diff检查通过。
- 修复原生卡片多余scope字段造成AI拒绝、主窗口缺刷新、批量静默截断、取消写入
  边界与旧测试的导航/可信Main路径断言。没有放宽Renderer路径或来源保护。
- 当前变更由主Agent自检；本轮辅助审查尝试因额度限制未运行，不能沿用前次
  code-review结论宣称新增AI/下载已获独立复核。

### 恢复点与剩余范围

[功能恢复进展](docs/product/REFACTOR-FUNCTION-MAP-20260911.md)、
[Visual AI](src/main/visual-ai/README.md)、[下载](src/main/managed-download/README.md)。
生产代码没有导入原型。未提交，原有暂存patch保持，无关改动保留。
本任务新增文件仅intent-to-add，未暂存内容。

集中禁用表原97项，恢复服务配置5项及下载2项后余90项。视觉AI通过新的受控
接口提供；旧全局反推/队列aliases不复活。数量不等于产品功能完成度。
整体重构尚未完成：真实模型效果验收、原分辨率/自由裁剪编辑、更多设计工具、模型安装及Runtime、
高级标签/维护、下载断点与部分Capture恢复、Windows/打包/真实大库仍未完成。
真实模型验收需要用户指定服务和模型并批准仅发送测试生成图片；当前没有该目标
答复，未读取真实配置/素材/权重或启动服务。合成响应只证明执行链路，不证明推理质量。
此前成果保留如下。

## 已完成：清理辅助开发分工字段

已移除项目指南、README、开发目标、连接库方案及设计文档中的固定辅助
模型分工、委托要求和驻守等待限制；主 Agent 直接负责完整交付与验收。
保留既有实现、测试证据、用户数据与明确批准边界。本次仅调整文档。

## 前次前端工作记录

用户要求继续深入完善整个软件的前端设计和流畅交互动画。
Astra 直接完成前端设计与实现。

### 交付

- WorkspaceMotion：页面入场、导航选中背景、分组选择、更多菜单、检查器、
  高级筛选与批量操作动效；退出控制面 inert/aria-hidden，路由不保留旧页面。
- 设置：外观/存储与采集/维护分组、主题预览、草稿保留、明确保存和错误反馈；
  兼容正式文件夹选择结果，取消保留原值；撤下虚假的缓存清理成功入口。
- 标签与总览重做，来源/下载/模型/AI 工作区统一页头、控件和状态层级。
- 网站新增、批量标签与 AI 设置使用焦点浮层；隐藏 AI 设置不再接收 Tab。
- 采集网站列表改为显式展开，取消悬停引发布局变化。
- 更新设计预览与 WORKSPACE-MOTION.md、局部说明。

### 实际验证

- Astra 独立运行 workspace-motion.test.ts 通过，根 dam-workspace-motion-gUx4df；
  另一组复核根 dam-workspace-motion-W88lFL，完整 Tailwind 样式截图已目检。
  覆盖真实 App 的 7 个辅助路由、设置/AI 分类键盘、草稿、文件夹选择返回值、
  两类浮层焦点、正常/减少动态、快速切换单一路由与退出菜单交互隔离。
  冻结合成 API、外网拦截，断言零实际写操作、服务/下载和外网请求。
- Managed Electron E2E 通过，根 dam-active-library-electron-e2e-GxxDkF；
  Connected Electron E2E 通过，根 dam-connected-electron-e2e-NLvMGa。
  保留创建/复制/搜索/标签/Trash/Restore/冲突/只读及字节哈希验证。
- typecheck、build、真实 Library 键盘、显示/标签投影、模型库 renderer、
  导航/交互内核、13组配色、context/router、ADR/forbidden/docs-sync/diff通过。
- 既有暂存 patch 逐字节保持，未提交。设计预览加入“重播动效”。

### 边界

源码已更新，未自动替换已安装应用；未访问真实素材库、Eagle、Runtime。
浏览器 smoke 是隔离证据，不代表真实服务、原生文件选择器或模型能力。
原生 BrowserView 跨进程隐藏/焦点交接协议没有在本轮重写或完成全场景验证。
未测定真实大库、各 GPU/系统和打包版本的长期帧率，不声称 60/120fps 保证。
视觉和动效不扩大 IPC、存储、来源变更或外发权限。
