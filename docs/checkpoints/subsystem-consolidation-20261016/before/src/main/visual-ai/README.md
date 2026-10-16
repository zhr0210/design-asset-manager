# 视觉能力与受控Provider调用

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/visual-ai.md)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

VisualAiPanel→visual-ai:*→VisualAiController→runVisionRequest→具体Provider/managed/Pi→验证→Host。prepare冻结当前所选素材、预览和配置，confirm才执行；独立标签/描述/OCR各有自己的current。

## 状态、提交与失败

预览最长边1024、受控白底JPEG，1–8项review绑定owner/库代际并有期限；当前具体codec/预算由visual-admission源码持有。单Provider只调用一次，request层仅对适用截断执行有界重试，共同deadline不扩大；HTTP/无效闭合结果不泛重试。人工内容优先，outcome-unknown不重发，通知失败不反转已提交成功。

## 平台与保留接口

缺失/失效默认模型明确提示，不自动选择第一项/切云；专用OCR独立。现行传输返回兼容旧四字段，但历史视觉OCR不替代专用OCR，文字与标签确认/反推采用各有边界。旧平台/模型质量数值只属当时报告。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/contracts/visual-ai.md)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--visual-ai--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
