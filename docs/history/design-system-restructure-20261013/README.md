# DESIGN职责归位与Apple参考融合

本次仅整理B副本文档，不修改产品源代码、生成CSS、库或发布产物。迁移前DESIGN完整原文、TASK检查点及ADR0493原文均保留；历史相对链接按原仓库根目录解析，原文不是当前规范。

[DESIGN.before.md](DESIGN.before.md)、[TASK.before.md](TASK.before.md)、[0493-dropover-style-interaction-allows-platform-native-implementation.before.md](0493-dropover-style-interaction-allows-platform-native-implementation.before.md)及[来源清单](manifest.json)提供逐段来源与SHA。用户提供的Apple参考按原字节保存在[参考文件](../../design/references/apple-web-style.source.md)，其网页布局不照搬到桌面工具。

## 逐节归位

| 原DESIGN章节/行 | 归位与处理 |
| --- | --- |
| 设计依据与边界 · 129–149 | DESIGN Overview；批准原型的资格方法归docs/agents/ui-ux-acceptance.md |
| 原生窗口 · 150–155 | 视觉几何归DESIGN Layout/Components，拖动职责归WORKSPACE-INTERACTIONS.md |
| 产品表面 · 156–173 | docs/design/WORKSPACE-INTERACTIONS.md：页面职责与入口 |
| 精确布局 · 174–210 | DESIGN Layout：保留桌面几何，宽度资格归验收流程 |
| 材料、颜色与字体 · 211–225 | DESIGN Colors/Typography/Elevation：蓝色主要操作替代旧灰色主操作，灰色选择保留 |
| 交互与动效 · 226–243 | 用户流程归WORKSPACE-INTERACTIONS.md，通用视觉反馈归DESIGN Components/Motion |
| 专注画布与笔记 · 244–260 | WORKSPACE-INTERACTIONS.md及图片笔记规格；Shift滚轮与B专注差异归最新悬浮窗规格 |
| 状态与验收 · 261–281 | 用户状态归WORKSPACE-INTERACTIONS.md，资格方法归docs/agents/ui-ux-acceptance.md，结果仍在CURRENT-STATE/原报告 |
| 普通文件夹与色板的正式交互 · 282–290 | WORKSPACE-INTERACTIONS.md及组织规格 |
| 多素材原生工作窗口 · 291–316 | 当前B用户行为归WORK-WINDOW-INTERACTIONS.md，技术权威归src/main/work-mode/README.md/ADR0493；旧窗口结构保留原文 |
| AI 结果与找回 · 317–328 | WORKSPACE-INTERACTIONS.md及AI找回产品规格；呈现样式归DESIGN Components |
| 专用 OCR · 329–347 | WORKSPACE-INTERACTIONS.md：OCR执行、取消、修订及配色/基础信息；通用样式归DESIGN |
| RUX 功能归属补充（2026-10-01） · 348–356 | WORKSPACE-INTERACTIONS.md：AI与模型入口；旧验收条件保留证据入口 |
| B原生工作集的已确认改造方向（2026-10-12） · 357–393 | 当前契约归WORK-WINDOW-INTERACTIONS.md、视觉归DESIGN、架构归ADR0493/模块README；v4/v5等时间线只保留在原文历史，不作为当前规则 |

## 当前入口

- [视觉设计系统](../../../DESIGN.md)：Apple视觉语言与DAM桌面组件，不含版本时间线或实现结论。
- [工作台用户流程](../../design/WORKSPACE-INTERACTIONS.md)：图库、详情、笔记、文件夹、AI/OCR与设置入口。
- [B工作窗用户流程](../../design/WORK-WINDOW-INTERACTIONS.md)：紧凑/展开/停靠、区域分工、颜色草稿、自动保存与未确认菜单范围。
- [工作模式实现](../../../src/main/work-mode/README.md)及[ADR0493](../../adr/0493-dropover-style-interaction-allows-platform-native-implementation.md)：原生呈现/桥接/Host权威。
- [验收流程](../../agents/ui-ux-acceptance.md)与[CURRENT-STATE](../../handoff/CURRENT-STATE.md)：方法、实际版本与缺口。

## 明确的替代范围

新悬浮窗规格替代旧24点阈值、72×160胶囊、展开窗停靠、32点恢复、旧HEX输入与旧专注缩略条位置；原件、权限、草稿和撤权语义保留。紧凑态220×240、全底板Liquid Glass、常显原生按钮与完整预览来自本轮确认；菜单作用范围尚未采纳。

主要操作改为系统强调色（网页默认#0071e3），普通工具与素材选择保持中性灰。DESIGN是目标规范，生成CSS尚未同步，旧界面/构建证据不证明目标已实现。

## 文档核对结果

YAML可解析、token引用均可解析，8个设计系统章节顺序正确；初次核对69个本地链接均有目标。原DESIGN的14个章节逐一映射，迁移前DESIGN与Apple参考的SHA核对一致。文档差异空白检查通过。

只读执行`node scripts/sync-gallery-tokens.mjs --check`报告`Gallery tokens differ from DESIGN.md`：设计已采用Apple中性色与蓝色主要操作，但现有生成CSS仍保留旧值。当前CSS与迁移前tokens逐字一致，差异来自本次设计规范更新。本次不运行写入模式，不将文档整理扩张为界面实施；该差异在CURRENT-STATE与TASK登记。没有运行产品构建、原生/UI验收或AI/OCR。

扩大到相关既有文档后发现四条原有失效引用：Mobbin旧入口已指向现存来源存档；工作集2026-09-20的三张截图在本副本缺失，改为明确缺失说明并保留原路径，没有伪造或跨版本替换截图。最终链接与token核对见[验证记录](validation.json)。
