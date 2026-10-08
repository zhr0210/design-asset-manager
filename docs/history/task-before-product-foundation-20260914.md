<!-- Historical TASK snapshot; relative links rebased for this archive location. -->
# Current Task

## 本轮已完成：移除内置网页采集；插件平台讨论稿（2026-09-13）

用户明确：保留本地素材库搜索和本地导入，移除内置浏览器、网页采集、外部来源
搜索及网站登录管理。后续再次澄清的实施范围保留独立下载队列、AI、图片工具、
入库恢复与共享存储。真实库验证暂停，不再等待路径或操作真实数据。

用户要求完成后列清删除项、保留项、实际状况与后果，担心误删其他代码。已经保存
移除前源码/测试/索引和原暂存patch；备份根为临时目录`dam-web-retirement-vwg7hgmy`。
插件平台仅作定位、架构和难度讨论；不直接实施SDK或市场。

## 当前进度

- 网页页面/状态、BrowserView管理、站点登录/搜索、解析器、网页注入及PhotoShow
  已从源码移除；Main/Preload和导航入口已解除。独立下载及核心素材能力保留。
- Playwright改为开发依赖，继续支持测试；不再作为应用运行依赖。Electron继续
  承担桌面界面渲染，不能把这项改动描述为移除全部Chromium。
- App存储不再新建网站表；已有历史网站/登录数据不删除，不升级或清理真实库。
- 网页退休、导航、本地检索、下载store/App存储、动效/键盘与完整Electron回归通过。
  完整流程仍为9素材/3标签/2确认关系，合成来源SHA保持；证据根
  `dam-active-library-electron-e2e-8MCBP7/evidence`，本地库界面已目检。
- Main登记183个invoke/0个入站event；AI/卡片/图片工具/下载出站通知保留。
  typecheck/build、打包配置审计、权限基线、context:check和Router 268评估通过。
- 111个受保护核心文件与备份逐字节一致，Eagle companion原有差异保持；原暂存
  patch保持，未暂存内容或提交。真实数据没有被读取、修改、迁移或清理。
- [移除报告](../product/WEB-COLLECTION-RETIREMENT-20260913.md)列出删除文件、
  保留能力、实际后果、备份及逐文件审计清单。
- [插件平台讨论稿](../product/PLUGIN-PLATFORM-DISCUSSION-20260913.md)已写入，
  含官方参考、宿主边界、SDK/安装流程、实施难度和阶段验收。

## 恢复

[此前任务记录](task-before-web-retirement-20260913.md)保留按需读取及
旧成果。旧网页规格和原型仅作历史，不是当前功能或新授权。

## 后续状态

网页移除与报告已完成。插件平台定位/架构/难度仅为讨论建议，尚未获准实施SDK、
安装器、隔离运行时、市场或Chrome/Edge连接器。真实库验证仍暂停。
