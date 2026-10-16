# 原件、Copy入库与派生文件

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host持有入库身份、存储角色与事务；Capture Gateway拥有Candidate、请求幂等与Promotion Link。Original、必要Preview、图像Variant/派生缓存分别拥有身份，Copy默认不移动外部源。

## 正式入口与运行链

正式文件选择/拖入/剪贴板或图片工具→受控prepare→精确review receipt确认→分项Copy/校验/必要预览→事务Promotion→Host回读/事件→素材工作台。prepare只读，不建立候选或写出文件；Renderer不选择任意目标路径或分配Asset身份。

## 失败、取消与兼容保护

签名/格式、长度、SHA、symlink/containment、no-replace发布和来源代际在适用边界复查。幂等重放返回已知提交；取消未开始项，已提交项保留。旧下载表只兼容既有schema，不恢复素材下载执行器；源失败与恢复资格不能用预览替代。

## 技术与平台边界

图片使用受控Sharp/libvips适配。平台文件身份/句柄/原子发布独立验证，格式和视频由实际消费者决定；递归目录/额外格式不能从一个Copy成功推定支持。

## 源码与详细机制

- [src/main/capture-intake/README.md](../../src/main/capture-intake/README.md)
- [src/main/capture-intake/add-assets.workflow.ts](../../src/main/capture-intake/add-assets.workflow.ts)
- [src/main/capture-intake/capture-gateway.ts](../../src/main/capture-intake/capture-gateway.ts)
- [src/main/library-lifecycle/owned-image-intake.ts](../../src/main/library-lifecycle/owned-image-intake.ts)
- [src/main/library-lifecycle/owned-image-recovery.ts](../../src/main/library-lifecycle/owned-image-recovery.ts)
- [src/main/image-tools/README.md](../../src/main/image-tools/README.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-asset-authority-baseline`
- `npm run test-intake-recovery`
- `npm run test-active-library-session`
- `npm run test-active-library-capture-composition`
- `npm run test-capture-intake-workflow`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
