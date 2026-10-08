# P01｜实际模块与拟议依赖规则

机器可读清单见`manifests/MODULES.json`。runtimeStatus描述现状，enforcementStatus均为design_only；本轮没有部署依赖检查器。

## 1. 最小依赖树

```text
VisualAiPanel / 主窗与卡片调用方
  → 各自窄Preload API
  → Main visual-ai IPC Adapter（sender/frame权限）
  → Visual AI应用控制器（意图、scope、提交后通知）
  → Active Library Host（连接/lease/generation）
  → Visual AI Storage（库内标签/证据事务）

Shared Contracts / JSON Schema
  ← Renderer、Preload、Main；独立开发期Python一致性验证
  × 不导入Electron、SQLite、文件系统、网络或具体Runtime

Composition Root
  → 创建/注入具体控制器、Host、窗口与Adapter

Vision transport / OCR Worker
  → 只执行已授权的输入处理/推理并返回结构化结果
  × 不调用本样本confirm-tag，不取得Host数据库连接
```

## 2. 规则与当前事实

| 规则ID | 边界 | 允许 | 禁止/必须核对 |
| --- | --- | --- | --- |
| D01 | shared样本契约/纯workflow | 同层纯types/契约 | main/renderer实现、electron、fs、SQLite、child_process |
| D02 | Renderer样本 | React、shared、窗口暴露的窄API | Node内置、DB、进程、直接模型网络调用 |
| D03 | Preload | contextBridge/ipcRenderer与纯契约 | 外露event、任意channel、直接文件/SQL/模型路径能力 |
| D04 | IPC Adapter | trusted sender、schema、注入controller | 直接SQL、任意spawn、将客户端role/trace当权限 |
| D05 | Visual AI应用模块 | Host窄接口；当前已有crypto/sharp/transport依赖如实记录 | getDatabase/新SQLite连接、写Eagle原件、无授权fallback |
| D06 | Host/Storage | Host注入的当前库数据库；事务/lease | 调用方传任意库路径/连接；Provider与Renderer越层写入 |
| D07 | transport/Worker | 已授权HTTP或受限本地计算 | 素材标签确认、库组织写入、偷偷选择另一个provider |
| D08 | Composition | 模块factory/平台Adapter注入 | 将可信权限写成客户端自报标记；业务操作重复写入 |

当前VisualAiController包含Sharp处理与多个能力，不在P01强行搬文件；规则先围绕选定契约/IPC/确认路径实施。主窗口sandbox=false是已记录现状，本轮不改Electron配置。规则不是对整个仓库已有依赖全部合规的声明。

## 3. 拟议可执行检查设计

IMPLEMENT时在少数真实入口上使用TypeScript AST/模块解析追踪`import`、`export from`、`import()`、literal require，并区分type-only与runtime。遇到计算生成的加载目标标UNKNOWN需审阅，不当作无依赖。不得以几个rg字符串命中/未命中声明依赖边界已强制执行。

Python只检查当前专用OCR runner及未来样本适配，不把整个历史ai-service的所有sqlite使用一刀切删除。静态import规则最多发现可见依赖，真正“Worker不能写Active Library”还需子进程参数、授权输入、文件访问和Host调用的隔离测试。

负向夹具包括：shared反向import Main，Renderer导入DB，Preload暴露任意invoke，IPC自行调用SQL，Provider调用Host写口，动态路径无法解析。预期AST结果与运行时Host spy分开记录；能解析的禁边必须阻止，未知边不能给PASS。

## 4. 数据所有权不会被新Result改变

Managed资产/确认标签仍经Active Library Host；应用配置仍属于App；Eagle仍是第三方原件权威；Legacy无写权限。一个共享错误信封不能把这些边界合并，也不能使某Provider得到写入标签或重新开启旧通道的权力。

本轮MODULES是契约评审清单，不是新的运行时模块注册表、自动任务队列或插件权限声明。
