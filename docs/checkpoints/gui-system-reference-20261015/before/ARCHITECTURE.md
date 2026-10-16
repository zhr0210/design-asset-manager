# DAM 技术架构

本文解释稳定结构、责任和平台差异。完整[子系统目录](docs/subsystems/README.md)连接当前运行链、模块、源码与验证；产品目标看[产品基准](docs/product/PRODUCT-FOUNDATION.md)，实际版本/资格仅看[CURRENT-STATE](docs/handoff/CURRENT-STATE.md)，详细目标看[规格目录](docs/product/specs/README.md)。源码存在不证明用户功能完成。

## 1. 进程与客户端

```text
Desktop React ─ Preload/IPC ─┐
Browser React ─ HTTP/SSE ────┼─ Electron Local Host（每个明确profile）
                            │  ├─ 持锁Library / App状态 / 凭据 / 事务
                            │  ├─ AI能力控制器 / 资源准入 / 事件与退出
                            │  ├─ Pi私有Node Worker / OCR与专用Python
                            │  └─ GGUF进程 / 平台helper / 文件交付
                            └─ 工作窗Controller
                               ├─ 默认Electron/React工作窗
                               └─ macOS B候选：Swift/AppKit子进程
                                  （NSPanel / NSCollectionView / 动画 / 拖放）
```

Desktop/Browser共享同一个产品Client和Host，Browser是正式本机客户端，不是局域网服务或独立数据库。原生卡片/工作窗是权限更窄的角色，不能冒充全工作区。关闭一个视图和退出整个Host分开；退出/切库须核对全部草稿参与者并排空。

## 2. 技术栈与平台矩阵

| 范围 | 共享部分 | macOS | Windows |
| --- | --- | --- | --- |
| 主工作台/设置/独立大预览 | React、TypeScript、Router、Zustand；DESIGN/token/motion | Electron Desktop或同机Browser | Electron Desktop或同机Browser |
| 默认工作集窗 | Host控制器、成员/修订/布局契约 | Electron BrowserWindow + React | Electron BrowserWindow + React |
| B悬浮窗候选 | Host内容/提交、私有快照/意图协议 | Swift/AppKit、NSPanel、NSCollectionView、QuartzCore、系统拖放/文件承诺；React仅按需大预览 | 当前启动器拒绝；不是复用Mac原生组件 |
| 视频参考帧 | 媒体记录、受控文件/range、资源账本 | AVFoundation Swift helper | Media Foundation C++ helper |
| 本地推理/资源 | Pi协议、可信Python、GGUF与共享准入 | Metal/共享RAM、libproc观测 | CPU/CUDA、平台进程/原生约束 |
| 数据/构建 | SQLite/better-sqlite3、Sharp/libvips、electron-vite/Vite、Electron Builder | 对应ABI/资源、DMG/签名公证 | 对应ABI/资源、安装器/签名 |

B已接入主程序的可选工厂：`src/main/index.ts`检查`--dam-work-window-candidate=b`才选择`createNativeShelfWorkWindow`。普通启动仍选`createElectronWorkWindow`；`npm run start:work-b`是macOS候选入口，不能在文档整理中改为默认。B不是SwiftUI；已有NSVisualEffectView不证明目标Liquid Glass完成。

精确依赖由package.json/锁、生成身份与实际平台产物核对；声明范围、锁版本、部署版本和资格分别表达。Linux/Windows/macOS依赖不能互拷，WSL执行不替代Windows原生验收。

## 3. 状态权威与依赖方向

- App profile拥有设置、凭据、草稿和App记录；活动Library拥有素材、人工内容、分析证据、组织与工作集。
- Active Library Host把已检查身份、存储角色、私有SQLite和真实独占lease绑定为不可拆分session；Capture/Promotion/Trash/维护复用该权威，不复用全局删除通道。
- Original、Preview、Variant/兼容交付分开；派生索引可重建，canonical向量/人工内容不是缓存。默认Copy不改变外部源，旧库只读单独处理。
- Renderer负责展示和输入，Shared负责契约/纯规则/Client；不能借Shared导入Main磁盘或Renderer全局副作用。组合根依赖适配器，领域能力不依赖UI组件或厂商私有实现。
- Worker只得受控输入/实际计划，不写Library。Host验证结果再事务提交、通知；发送、响应、验证、提交、通知和物理释放是不同事实。

## 4. 执行链与兼容

检索实际从Library/useHostAssetSearch通过searchAssetsPage或retrieval.query到Host，包含词法/颜色分页及已准备空间的语义/图像链，不再是仅加载行上的内存匹配。硬条件、快照、模型空间及异步后权限复核由对应拥有者保证。

基础分析、独立标签、描述、OCR、深度分析/反推共享适用资源与提交机制，但每项能力有自己的输入/证据/current。Pi统一允许协议，不等于本地推理加速或全能力资源治理；旧FastAPI/poller只描述其自身lane，不能套到所有当前路径。

正式managed模型库存与来源/恢复传输已存在；签名官方Catalog核心/registry/pilot仍各有受限资格，不能将后者未交付的完整生态误记为模型管理全部未实现。32个旧Runtime/branch/probe及通用Runtime Package操作被当前生产注册拒绝，保留模块/测试不表示普通入口启用。

会话、角色、成员、来源、修订和撤权贯穿每次动作；A→B→A不复活旧权限。未知提交不盲重发，取消不等于远端停止/零费用或本地进程退出。驻留、计算、材料、外发许可各有生命周期，UNKNOWN保守处理；更换实现须保持这些保证而不冻结内部类名。

## 5. 代码与能力地图

跨层完整链见子系统正文，局部机制见源码旁README：

| 位置 | 责任 |
| --- | --- |
| src/main/index.ts、ipc | 唯一组合/命名注册，不容纳所有领域算法 |
| local-host、app-shutdown、shared/client、preload | 本机传输、角色、草稿、退出和窄桥 |
| library-lifecycle、capture-intake、app-storage | 持锁库/事务/存储角色、Copy、恢复、App状态 |
| asset-search、retrieval-workspace | 词法/颜色/向量、快照、query grants与解释 |
| background-analysis、independent-tags、ocr、visual-ai | 能力调度、执行/决策、证据/提交 |
| ai-gateway、ai-credentials、pi-runtime | 连接/账号安全、封印协议Worker |
| model-library-workspace、model-library、local-ai-resources、services/ai-runtime | 正式库存与隔离core、预算与真实进程生命周期 |
| work-mode、asset-card、native/shelf-candidates | 获授参考窗、原生呈现、视频/文件交接 |
| platform、packaging、scripts、CI | 平台适配、资源闭包、验证与发行 |

目录不是生产可用证明。变更先明确实际消费者、迁移/失败影响，更新唯一契约正文；详细流程、UI、目标、版本结果各有归属。构建须包含真实Worker/import/helper资源，开发目录能跑、安装包完整与用户真实可用分别证明。发布/签名不由文档更新自动授权。
