# 内置网页功能移除报告

2026-09-13。范围按用户后续澄清执行：移除软件内网页浏览/采集、外部来源搜索和
网站登录管理，保留本地素材库能力及独立下载。真实库验证暂停。

## 执行了什么

| 类别 | 实际操作 |
| --- | --- |
| 页面与导航 | 删除BrowserPage、外部Search、Sites及对应状态；菜单/侧栏/仪表盘移除网站入口。旧`/browser`、`/search`、`/sites`回到本地素材库。 |
| 内嵌网页运行 | 删除BrowserView管理、网页预览/脚本注入、专用browser preload、扫描解析器和PhotoShow资源。构建不再产生browser preload。 |
| 登录与外部搜索 | 删除Playwright网站登录、认证状态服务、网站服务、网页搜索服务及对应IPC/Preload入口。 |
| 网页交互支撑 | 移除仅服务于内置浏览器的隐藏/快照/原生覆盖控制、网页悬浮库按钮与注入下载动画；导航菜单仍使用原来的React/动效组件。 |
| 共享调用方 | AppShell解除网页挂载，下载store解除网页注入回调与旧网页排队分支；独立下载确认/续传/恢复/释放保留。 |
| 依赖与数据兼容 | Playwright改为开发依赖用于测试。App存储不再新建网站表；已有网站表/记录不删除，原有库schema不变。 |

共移除28个第一方源码文件、3个仅验证退役功能的测试文件，以及454个PhotoShow
第三方资源文件（仓库内容约3.12MiB）。移除的测试由网页退休/保留能力回归替代，
并更新导航、下载和完整Electron测试。

## 明确保留什么

- 本地素材库搜索，包括词法/标签/别名及当前已有的命中解释。
- 本地文件导入、素材库生命周期、Copy/Promotion、Trash/恢复及原件保护。
- 独立图片直链下载、确认入库、断点续传、重启恢复、放弃任务与检查点释放。
- AI配置与当前已接线分析、图片工具、原生悬浮卡片及按ID素材读取。
- Model Library、Runtime代码、Eagle连接库及Eagle companion、旧库只读入口。
- 真实素材、原件、数据库结构、历史来源字段和旧网站/登录文件；没有操作真实数据。
- 历史文档及未挂载原型，保留追溯用途，不作为当前可用功能。

已对移除前源码备份逐文件比较：上述核心目录与本地搜索/资产store等111个受保护
文件保持相同字节；Eagle companion的既有工作区差异也逐字节保持。Main入口、
Preload与AppShell等组合文件有必要修改，以解除网页调用，并非宣称整个项目零改动。

## 移除后的状况和后果

1. 应用能继续构建、启动和使用本地素材工作流。外部网站不能再在应用内浏览、登录、
   搜索或注入采集按钮；旧网页专用IPC调用不再有处理器，不保留隐藏的浏览器后备实现。依赖这些网页专用接口的旧脚本也不再可用。
2. 独立下载页仍允许用户提交图片直链。这不需要嵌入网页，是按收紧后的范围保留的功能。
3. 暂时没有新的Chrome/Edge采集连接器。未来需单独实现身份绑定、来源传输、目标库
   确认和安装流程；本轮没有安装或卸载用户浏览器里的任何扩展。
4. 软件仍采用Electron呈现桌面界面，Electron自身的Chromium/Node组成仍在。不能
   将本次移除描述成“彻底移除了浏览器内核”或据此承诺安装包大幅缩小。
5. 旧账号、Cookie或来源字段未被清理；不做真实库迁移、降级或数据抹除。
6. `src/main/plugins`原来只是三个网页解析/类型文件，不是通用插件平台；移除它们
   没有删除一个已存在的开放插件生态。新平台仅有讨论稿，尚未实现SDK或安装器。

## 验证

- typecheck、生产构建通过；Main产物无Playwright、BrowserView/WebContentsView或
  PhotoShow引用，`out/preload/browser.cjs`不存在。Playwright仍供开发测试使用。
- 网页退休、导航、本地Asset Discovery、下载store/状态、App存储兼容与权限基线通过。
- 工作区动效/键盘交互测试与Electron打包配置审计通过。
- Main登记183个invoke、0个入站event通道；删除的16个invoke和4个入站event属于
  网页功能。AI、卡片、图片工具和下载的出站通知仍保留；通道数不是功能数。
- 完整Electron E2E通过：旧网页路由回本地库、菜单和Bridge无网页入口；本地搜索/
  标签/Copy/Trash/AI/原件裁剪/下载/重启恢复保持。最终9素材、3标签、2确认关系，
  外部合成来源SHA不变。证据根`dam-active-library-electron-e2e-8MCBP7/evidence`。
- Context路由检查及268项路由评估通过；未运行真实库验证或Windows/打包发布验收。

## 可回溯清单与备份

- [移除前源码、测试与索引备份](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-web-retirement-vwg7hgmy/source-before-removal.tar.gz)
- [逐文件审计清单](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-web-retirement-vwg7hgmy/removal-audit.json)
- [原暂存差异](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-web-retirement-vwg7hgmy/staged.patch)

备份可按具体文件检查或恢复，无需回滚整个工作区；当前未执行恢复或提交。

### 删除的第一方源码

- `src/main/ipc/browser.ipc.ts`
- `src/main/ipc/search.ipc.ts`
- `src/main/ipc/site.ipc.ts`
- `src/main/plugins/generic-image-extractor.plugin.ts`
- `src/main/plugins/generic-image-page.plugin.ts`
- `src/main/plugins/types.ts`
- `src/main/services/auth-state.service.ts`
- `src/main/services/browser-preview-injection.ts`
- `src/main/services/browser-view.manager.ts`
- `src/main/services/playwright.service.ts`
- `src/main/services/search.service.ts`
- `src/main/services/site.service.ts`
- `src/preload/browser.ts`
- `src/renderer/components/browser/BrowserViewport.tsx`
- `src/renderer/components/layout/DownloadToLibraryAnimationLayer.tsx`
- `src/renderer/components/layout/LibraryDockButton.tsx`
- `src/renderer/lib/appInteractionKernel.tsx`
- `src/renderer/lib/downloadAnimationEvents.ts`
- `src/renderer/lib/nativeBrowserViewVisibility.ts`
- `src/renderer/routes/BrowserPage.tsx`
- `src/renderer/routes/Search.tsx`
- `src/renderer/routes/Sites.tsx`
- `src/renderer/stores/browser.store.ts`
- `src/renderer/stores/extractor.store.ts`
- `src/renderer/stores/search.store.ts`
- `src/renderer/stores/site.store.ts`
- `src/shared/workflows/app-interaction.workflow.ts`
- `src/shared/workflows/library-dock-geometry.workflow.ts`

### 插件平台讨论

[定位、架构、安装流程与实施难度](PLUGIN-PLATFORM-DISCUSSION-20260913.md)。这是后续建议，不是本轮已交付功能。
