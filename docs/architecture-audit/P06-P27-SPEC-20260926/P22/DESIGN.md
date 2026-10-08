# P22 IPC权限清单与sandbox ADR（Proposed）

## 现状与权限矩阵
| 表面/入口 | 当前可核查权限 | 目标加固 |
| --- | --- | --- |
| 主窗口visual-ai | trusted Main，prepare范围与receipt | 严格版本化schema、每动作scope/token |
| 原生卡片visual-ai | trusted card、当前素材/owner绑定 | 继续成员范围，不扩为整库 |
| asset-ocr | trusted Main-only | 维持，不能因新Job API开放给所有窗口 |
| 工作窗口 | 自包含窄workWindowAPI，set成员preview/笔记 | 每次操作重核成员/session/revision |
| 旧Runtime/Worker/global delete | disabled aliases拒绝 | 不能为兼容新架构恢复 |
| 模型Provider/Python | 无Renderer IPC写库权 | 保留不可信输入与Host单写 |

主preload虽宽不等于每个函数有正式handler；需逐项建立caller→bridge→handler→authority映射后删/迁移。类型安全不替代runtime schema；IPC方法名固定，不暴露通用invoke(channel,args)。跨context事件包装不把Electron原event对象传Renderer。

## 迁移步骤
先冻结P01契约/调用方清单→按功能拆main bridge且保持老方法委托→消除sandbox preload不支持的Node/模块副作用，打包成自包含入口→在合成库正式Electron验证所有流程→开启主sandbox→平台包/原生依赖验收。任何版本升级单独评估better-sqlite3/Sharp ABI、构建工具、签名和恢复，不自动重编依赖。
锁文件及已安装package都声明Electron30.5.1，本地d.ts存在sandbox/permission/windowOpen声明，但这不是运行验收；latest安全文档只作机制参考。[Electron security](https://www.electronjs.org/docs/latest/tutorial/security)、[sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox)（访问2026-09-26）。不把启动成功或build当所有窗口安全完成。

## URL、权限与敏感数据
trustedSender需匹配webContents ID、主frame身份、规范化entry URL（fragment可变化，query/origin/path不任意变化），子frame拒绝。window member token由Hostregistry绑定当前session/成员，URL可猜到仍须受控协议校验；Cache-Control no-store不等于授权撤销实现。
主窗口目前直接shell.openExternal(details.url)：目标改为显式外链validator，允许受审http/https或明确用途协议；拒javascript/file/credential URL与模型文本触发打开。具体协议名单待审，无未经用户意图的自动打开。
CSP生产脚本/资源仅打包可信源，connect-src按UI职责最小化；推理网络走Main/P14。permission request/check deny-by-default并逐项业务例外，导航/弹窗/下载/clipboard各有目的边界。Worker进程隔离不是OS sandbox，Python本地运行仍属受信Runtime选择。

## 验证与回退
本轮参考模型测试伪sender/frame/query、过期scope、工作窗跨成员与channel白名单；生产Electron/renderer文件访问/CSP/外链/平台NOT_RUN。未来T02/T07/T19/T20/T21/T24必须正式主窗/卡片/8工作窗回归及被撤销preview、迟到消息测试。
Proposed决定：先窄bridge兼容再sandbox切换，保持现有UI；安全未达成不通过取消sender检查临时兼容。原有未提交代码不改。
