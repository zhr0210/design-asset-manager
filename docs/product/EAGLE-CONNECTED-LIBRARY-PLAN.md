# Eagle 连接库：确认方案与本批边界

用户在本会话完成 grill-me 访谈并确认开始旧库只读盘点及合成库开发验证。
本文记录已确认目标，不将设计、官方文档或合成测试写成真实 Eagle 交付。

## 已确认的用户行为

- 正式原件只保留一份，由 Eagle 库管理。本软件保留索引、AI 结果、版本基线、
  待提交操作和日志；预览缓存可重建，编辑及冲突文件按需暂存并设置容量上限。
  配额不足暂停新增编辑，不自动销毁未提交修改。
- 元数据、文件内容、移入回收站与恢复双向同步。默认整个库，可限制文件夹；
  所选范围是自动同步边界，移出范围不能自动等同删除。
- 新增素材跟随当前工作区归属；Eagle 关闭时暂存，连接且确认入库成功后
  释放本软件自有暂存。用户外部来源不因该流程被移动或删除。
- 启动/重连检查变化。不同字段的独立修改合并；同字段、双边文件变化或
  删除与编辑冲突保留双方，在本软件选择版本或搁置，其他项目继续同步。
- Eagle 正常使用优先；不写内部 metadata 文件，不将未解决状态强制写回。
  Eagle 未运行时保留索引及待提交修改；源卷不可访问时明确原件不可用。
- 回收站至少保留 30 天，到期提醒，用户确认后才清理指定关联素材。
  未完成同步和冲突项暂停清理，不清空整个第三方回收站。Eagle 中直接永久
  删除唯一原件后不能承诺恢复，保留删除记录以免自动复活。
- 本地协调服务配合 Eagle 插件；关闭窗口继续同步并显示菜单栏状态；明确
  退出时安全停止并保存队列，下次恢复。开机自启默认关闭。
- 旧 DAM 库单独找回，不自动并入 Eagle，不以复制全部原件解决兼容问题。

## 架构与实施顺序

1. LegacyReadOnlyWorkspace：只读发现和摘要、旧素材访问与失败解释，不调用
   initDatabase、legacy migration 或现有 writer，不将旧 DB 绑定到可写 Host。
2. ExternalConnectedLibrary：独立于 Managed Copy 的 provider/library/item
   身份、scope、generation、能力协商、索引和同步状态。Eagle 引用不是
   Capture Candidate、Promotion 或 managed Original。
3. 同步 Journal：保存基线、字段变化、幂等操作、待提交队列、冲突、回执和
   删除记录。超时不能直接重发破坏性动作；先核对外部结果，再恢复执行。
4. Eagle Adapter/插件：官方接口读取、提交及回读验证；库切换、版本不支持、
   未授权、未知客户端和任意路径请求拒绝。Renderer 不直接持有路径/端口权限。
5. UI/后台：渐进索引、连接评审、待同步、冲突选择/搁置、编辑暂存、
   Trash/Restore、到期清理候选及退出恢复。原有本地 Managed 库保持可用。

本地排队或 SQLite 锁不能证明 Eagle 外部编辑被锁住。提交前复核与提交后
验证不能冒充跨应用原子事务；无可靠条件提交机制的并发文件替换保留待处理，
不得以 mock 证明不存在的互斥保证。每个软件适配器独立声明真实能力。

## 本批授权与验收

允许旧版默认存储及配置指向的库只读盘点；源码、共享契约、插件工件和
合成验证可实施。主 Agent 负责关键设计、实现、自检、已授权的真实旧库
只读盘点及最终审查集成。

真实 Eagle 库不读写，不连接用户 Eagle API，不向用户 Eagle 安装插件；
真实连接/插件安装/写入必须在具体连接范围与影响可审阅后获得批准。
不启用 AI/Runtime，不上传素材，不安装系统常驻服务，不执行真实永久删除。

验收包括：真实 Adapter/插件 handler 对合成协议端、独立 SQLite 与生成
文件；离线/重连、双边冲突、幂等回放、库/卷身份变化、scope、配额、
崩溃恢复、Trash/Restore 与到期确认；Main/Preload/Renderer 合成闭环。
未实际运行 Eagle 时明确称协议合成验证；现有 Managed E2E 与治理不回退。

## 已完成的旧库只读盘点

默认旧数据库存在，SQLite quick_check 通过：6 Assets、62 Tags、25 条关系。
每项的主文件、原件、归一化文件和预览引用均指向存在的普通文件。
数据库 hash/stat 与设置 stat 前后未改变，没有 SQLite 恢复侧文件。
未打开素材字节，因此只证明引用存在及数据库结构检查通过，不证明每个
文件内容可解码或与历史版本一致。旧库不可见由新版未接旧入口解释。

## 本批实施与验收结果

已在主源码接入 Legacy 只读工作区、ExternalConnectedLibrary 独立模块、
Eagle Web Adapter/Companion 工件、窄 IPC/Preload、两种独立页面与后台协调器。
生产 Eagle provider 默认未配对，不探测本机端口；真实删除能力未开放。
当前界面为受限连接流程，合成验证不等于完整真实 Eagle 产品支持。

Astra 复核并修复验收阻断项：查询三态避免把网络失败当删除；入口串行化与
关闭 drain；不可变编辑基线；逐字段冲突选择/离线搁置；缺可信身份时只读；
Legacy 恢复侧文件拒绝、显式素材根、受限图片读取。主源码独立运行核心、
Adapter/实际插件 handler、Legacy、IPC、后台、工件、注册/导航、权限守卫、
加载/键盘、类型/构建与治理通过。

两套正式 Main/Preload/Renderer 合成 Electron E2E 在主仓库通过：
Connected 证据根标识 dam-connected-electron-e2e-LuUC2i，
Managed 回归根标识 dam-active-library-electron-e2e-AlsjI5。
未连接真实 Eagle、未安装插件、未重装已安装应用。跨应用 CAS/原子提交、
真实配对身份与源卷读取、真实永久清理仍没有交付证据。

## 官方接口依据（实施时复核版本）

- [Web API](https://developer.eagle.cool/web-api)：Eagle 运行时提供接口；V2
  文档要求 Eagle 4.0 Build 21 或更新版。
- [Item Web API](https://developer.eagle.cool/web-api/api/item)：元数据与
  isDeleted 更新等能力，不能据此推断所有格式或事务行为。
- [Plugin Item API](https://developer.eagle.cool/plugin-api/api/item)：save、
  replaceFile 等；推荐先保存并验证新文件，再调用受支持替换接口。
- [Eagle 回收站规则](https://cn.eagle.cool/support/article/does-eagle-automatically-delete-items-in-the-trash)：
  官方说明不会自动清空；30 天提醒是本软件策略。
