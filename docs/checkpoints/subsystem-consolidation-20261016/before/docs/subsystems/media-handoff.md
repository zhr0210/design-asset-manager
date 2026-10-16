# 视频参考帧与跨应用文件交付

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host拥有视频引用、时间/帧/来源记录及独立交付副本；原件、首帧预览、参考帧和兼容导出分开。移除工作集关系不删除视频或交付副本。

## 正式入口与运行链

正式Copy/工作集→视频controller→平台解码helper与共享准入→保存请求/实际时间及完整PNG→限定媒体GET/HEAD/range；交付动作→验证当前成员/来源→生成独立副本或ZIP→系统拖放/默认应用→核对接收。

## 失败、取消与兼容保护

不以首帧冒充整段分析；范围请求在权限之后，非法/多range拒绝。交付不移动/覆盖第三方源，不以open-requested或拖动结束证明接收成功。取消保留已完成项，未确认helper退出保持占用；清理按显式归属和真实接收检查。

## 技术与平台边界

macOS AVFoundation与Windows Media Foundation是不同helper/资源绑定；只按已支持codec/旋转/大小/时长/分辨率接受。记录requested/actual时间，不为Mac写Windows方法标签；文件承诺来源数量未知时保持未确认。

## 源码与详细机制

- [src/main/work-mode/work-media-controller.ts](../../src/main/work-mode/work-media-controller.ts)
- [src/main/work-mode/work-media-storage.ts](../../src/main/work-mode/work-media-storage.ts)
- [src/main/work-mode/work-file-handoff.ts](../../src/main/work-mode/work-file-handoff.ts)
- [src/main/work-mode/macos-video-runtime.ts](../../src/main/work-mode/macos-video-runtime.ts)
- [src/main/work-mode/windows-video-runtime.ts](../../src/main/work-mode/windows-video-runtime.ts)
- [src/main/work-mode/media-response.ts](../../src/main/work-mode/media-response.ts)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-desktop-viewport-policy`
- `npm run test-app-navigation-workflow`
- `npm run test-electron-main-lifecycle-policy`
- `npm run test-work-frame-provenance`
- `npm run test-file-selection-bulk-ui`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
