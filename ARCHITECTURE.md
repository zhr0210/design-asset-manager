# DAM 技术架构与代码地图

本文解释稳定结构和责任，不维护某台机器的资格/PASS快照。实际状态见
[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)；产品目标见[产品基准](docs/product/PRODUCT-FOUNDATION.md)。
2026-10-06按当前目录、Local Host、工作窗口及AI Gateway调用说明复核；目录存在不证明某功能已可用。

## 1. 产品形态与进程

```text
Desktop Renderer ── Preload / IPC ──┐
                                   ├─ 一个 Electron Local Host（每个明确 profile）
Browser Renderer ── 本机 HTTP/SSE ──┘      │
     共享 React 产品与 Client 契约        ├─ 当前 Library 权威、事务和受控文件
                                         ├─ 账号/设置、任务、原生窗口与退出
                                         └─ Pi / OCR / 本地执行进程 / 云端协议适配
```

Browser 是正式本机产品客户端，不是远程开发服务器或另一个数据后端。
原生卡片和 Work Window 有更窄的身份、成员与媒体权限，不能冒充主工作区。
关闭一个客户端与退出整个 Host 是不同动作；跨端草稿和任务状态不能由一个页面单独决定。

## 2. 技术栈及版本事实

| 层 | 采用的技术 / 责任 | 精确事实来源 |
| --- | --- | --- |
| UI | React、TypeScript、Router、Zustand；样式/token及motion沿用项目规范 | package.json / package-lock.json、DESIGN.md |
| 桌面宿主 | Electron；原生窗口、系统凭据、应用生命周期 | 锁文件、实际平台与进程版本 |
| 构建 | electron-vite / Vite、TypeScript、Electron Builder | electron.vite.config.ts、tsconfig.json、package.json |
| 数据 | SQLite、better-sqlite3；活动库与App状态分开 | Host composition、schema与匹配Electron ABI产物 |
| 图片 | Sharp/libvips等受控预处理 | 锁文件、平台资格、实际安装资源 |
| 模型协议 | Pi独立Node Worker和既有兼容服务适配 | pi-runtime锁、release清单与真实执行 |
| 专用推理 | OCR/Python/本地Runtime按具体能力运行 | 对应模块、环境与质量/资源证据 |
| 双端传输 | 命名Client、Desktop IPC、loopback HTTP/SSE | src/shared/client、src/main/local-host |

不在多份手写文档中重复易漂移的具体版本。依赖声明范围、锁定版本、实际部署版本和验证资格须分别核对。
Linux、Windows与macOS依赖不能互拷；WSL执行不自动证明Windows原生结果。

## 3. 代码地图

| 位置 | 拥有什么 | 不拥有什么 |
| --- | --- | --- |
| src/main/index.ts | 当前组合入口、服务装配、启动/关闭协调 | 不应包含所有领域算法 |
| src/main/local-host/ | 浏览器会话、命名命令、选择凭据、媒体/事件和草稿协调 | 通用SQL、任意文件/命令、第二套领域数据库 |
| src/shared/client/ 与 src/preload/ | 产品Client契约、传输适配和窄桥 | 数据权威或无限invoke |
| src/renderer/ | 共享展示、导航、输入草稿和可恢复交互 | 可信路径、模型进程、SQLite写权 |
| src/main/library-lifecycle/、capture-intake/ | 受检活动库、lease、Capture/Promotion、恢复/Trash提交 | 未授权修改外部源 |
| src/main/independent-tags/、visual-ai/、ocr/ | 各能力输入、任务/执行检查、结果提交协调 | 用户隐私的任意读取、绕过Host落库 |
| src/main/background-analysis/、background-ocr/ | 已有计划与单能力调度边界 | 目录存在不代表全能力自动执行或Governor完整 |
| src/main/ai-gateway/、ai-credentials/ | Provider/连接/账号生命周期与安全凭据接口 | 普通Renderer读取秘密、静默外发 |
| pi-runtime/、ai-service/ | 模型协议、专用推理和隔离执行 | 活动资料库权威写入 |
| src/main/work-mode/、asset-card/ | 原生参考窗口、成员范围、恢复与撤权 | 删除原件或替代全库整理 |
| src/main/external-connected-library/、src/main/legacy-readonly-workspace/ | Eagle独立原件权威、旧库只读找回 | 强行转换为Managed ownership |
| src/main/model-library/、src/main/model-library-workspace/ | 模型制品与受限产品入口，各按实际接线判断 | 下载或probe直接等同安装激活 |
| src/main/platform/ 与构建工具 | OS、原生资源、文件身份和打包差异 | 向共享UI泄漏任意平台权限 |
| scripts/、docs/history/ | 测试/维护工具与历史 | 自动生产入口或新任务授权 |

目录地图用于定位，不是所有子目录都在当前生产图内的证明。清理前核查动态入口、打包、测试和设计参考消费者。

## 4. 状态所有权和依赖方向

客户端表达产品动作；Host检查身份、数据范围、修订与当前会话，再调用领域服务。
计算进程只接收必要的受控输入，返回有来源的结果；Host事务保存并发布已提交变化。
Active Library 与 App Download 使用独立 SQLite；历史 Site 数据仅兼容，不新建网站功能。
Capture/Promotion/Trash 必须使用已检查且持有独占写锁的 Active Library Control Directory connection；
不能复用全局库或旧删除 channel，活动库模式的 `assets:delete` 固定拒绝。
Model Library管理权重/数据Artifact，Runtime Package管理可执行依赖；下载、probe和已验证激活不是同一状态。
App设置/凭据/草稿归明确profile，资料库内容归当前Library；实现不满足时应修正，不用特殊启动器遮蔽。
已发送、已返回、已验证、已提交、已通知和已释放是不同事实，不能用其中一步推断其余步骤。

Shared放契约、纯规则与可复用客户端定义；不能通过它偷偷导入Main的磁盘或Renderer的全局副作用。
组合根依赖具体Adapter，领域能力不依赖某个UI组件或厂商私有参数；新后端变动优先收敛在适配边界。
跨模块流程使用明确调用/服务关系，事件用于已发生状态的通知；不能用事件堆出不可追踪的隐式业务指挥链。

## 5. 必须保持的产品语义

Original、Preview、Variant以及Candidate/Asset分开；默认Copy，不静默改源。
用户确认/编辑与模型证据分开；新推理失败不清空旧有效结果，迟到响应不覆盖较新输入。
会话授权不是持久任务记录；关库、换库、换账号/目标后重新核对资格，A→B→A不能复活旧权限。
未知提交先检查权威结果，不自动重复副作用；取消不等于远端停止计费或本地子进程退出。
共享资源账本区分驻留与临时占用；真实危险/UNKNOWN保守处理，单能力不支持不扩散成无关停机。
资源许可恢复不恢复被撤销的业务权限。账号登录归 Main；页面退出仅解绑，明确取消、目标改变与退出应用按账号生命周期收敛；收到回调不等于凭据提交。
所有浏览器和原生窗口调用保持各自scope，loopback不自动免除Origin/会话校验。

这些是语义，不是永久冻结类名、目录、状态字段或旧函数的理由；替换实现须证明等价或明确迁移。

## 6. AI目标架构与当前实现分开

当前入口：[Local Host](src/main/local-host/README.md)、[AI Gateway](src/main/ai-gateway/README.md)、[Library](src/main/library-lifecycle/README.md)、[Work Mode](src/main/work-mode/README.md)。
Pi/专用OCR/Python按实际链路执行；Legacy Worker保留的结果同步走Electron poller，不能绕过权威提交，也不将旧poller描述套到全部Pi请求。模型推理不在Electron Main线程执行。

目标主链：能力请求 → 持久任务 → 配方与执行配置 → 资源准入 → 后端执行 → 独立结果/证据 → 检索与复用。
标签、描述、OCR是可分别完成和重跑的能力；物理执行可共享模型/预处理，不用为了逻辑独立重复所有计算。
模型驻留、计算许可、输入材料和用户外发许可是不同生命周期。Pi只统一协议，不自动等于推理加速或资源治理。

独立描述、统一Governor、全能力后台协作、语义/混合检索和设计助手应按真实用户任务接入已有链路。
在当前状态中逐项记录能否通过普通入口使用，不能从目标目录、接口或受控测试推出生产可用。
先完成少量验证组合，再扩模型；不先冻结微服务、通用Agent平台和完整插件市场。

## 7. 构建也是产品边界

正式功能需要的Worker、本地导入文件、原生库和资源必须进入对应平台的实际产物。
源码可编译、开发目录可运行、安装资源完整、真实账号可用和模型质量是不同证据。
生成规则决定依赖闭包；不能只手动复制资源或修改seal摘要让某次测试通过。
签名/发布属于独立动作，但开发交付也应提供清楚且可复现的本地启动入口，不只交散落的脚本。

## 8. 改变架构时

先明确受影响用户结果、实际消费者、数据迁移及失败恢复；优先小范围替换重复责任。
难以逆转的决定进入现有ADR体系，普通函数/参数/测试变化留在模块和任务记录。
原型保留为视觉参考，Tracer明确隔离；它们可以支持研究，但不能代替普通产品能力。
