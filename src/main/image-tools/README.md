# Image tools

正式入口为 Library Inspector、内嵌卡片和原生卡片中的图片工具。
`prepare → review → save` 生成真实 PNG 结果，经明确保存后成为新素材。
不覆盖来源，不外发，不把派生副本标为 Original。

## 输入与裁剪

`ImageToolOptions.source` 可选：缺省 `preview` 保持旧调用行为，输入为最长边
1600 的受控预览；显式 `original` 使用当前 Managed Library 的受管原件，
输出最长边可至8192，不放大输入。原件不可用时明确拒绝，不回退到预览。
两种模式限制输入/输出32MB、输入5000万像素；每次只处理一个原件转换/保存，
另保留原有最多四项待处理/预览任务限制。过期待审结果在后续请求时释放。

可选 `cropRect` 为0–1归一化的 left/top/width/height，基于EXIF方向归正、
用户旋转、水平镜像之后的画面。坐标须有限、尺寸为正、范围不越界，且只能
与 `crop: original` 同用。缺省区域时，原有居中比例裁剪及镜像顺序保持。
区域换算到实际输入像素，取整至整像素边界，最小1像素。

界面支持拖拽框选、百分比输入和方向键移动。裁剪参考画面通过同一prepare
链路生成，随后丢弃其receipt，只供选择区域；它不能直接保存。原件模式下
参考图仍最多1600像素，但最终裁剪使用受管原件。输入/旋转/镜像变化要求
重载参考画面；区域或尺寸变化使旧结果失效。review显示输入来源、输入尺寸
和实际输出尺寸，明确区分原件分辨率副本与预览副本。

## 原件与写入边界

Main内部 `managed-original-read.ts` 仅在Host持有当前Library lease时，按
素材身份、active/managed lifecycle、版本和Capture原件引用定位库内文件。
不接受Renderer路径；拒绝越界、符号链接、非普通文件、额外硬链接及超限。
有界读取前后核对文件/目录身份、素材绑定和Capture记录的源SHA-256。读取
指纹仅由Main保存，save再次验证；原件被替换或改动后，旧receipt不能保存。
该内部读取方法没有新增Preload channel，也不接到Eagle或Reference来源。

save消费五分钟单次receipt，绑定窗口、Library identity/generation、素材
revision、预览generation和冻结输出。原生卡片仅能处理当前素材；换图/关窗/
切库撤销待确认结果。保存进入Capture后通过既有drain完成，不承诺回滚已提交
副本。重复保存只允许一次执行。已提交结果的通知失败不伪装成写入失败。

Host通过共享 `owned-image-intake.ts` 产生新Managed Asset。复用既有
image_metadata_json记录来源Asset/version/preview、原件指纹（原件模式）和
recipe；不复制原素材AI描述或确认标签。预览派生物与原件
派生物使用不同来源标签。首次确认保存会提示并升级v4，记录输出SHA、来源和处理参数；预览/放弃预览不升级。
部分Capture或元数据收尾失败后，可在资料库“入库恢复”重新核验并确认恢复，
不重新运行图片变换。恢复保护用户修改的名称/文件名、描述和标签，不自动清理冲突。
此前未记录持久意图的历史副本不被猜测认领。
Renderer blob URL在预览替换/卸载时释放。

## 验证范围

`npm run test-image-tools-integration` 使用生成大图和临时库，验证旧请求、
原分辨率、区域实际颜色、EXIF、旋转/镜像坐标、参数拒绝、源身份/SHA、符号
链接与ownership拒绝、并发/取消、单次保存、描述保护、派生记录和重开。
`test-active-library-electron-e2e` 覆盖正式Preload和原生卡片拖拽/键盘/数值
裁剪、审阅和保存，并保留原流程与来源SHA后置条件。执行结果见TASK。
这些合成证据不代表Windows、打包应用、真实用户库或任意格式支持。

副本恢复、v4兼容及验证见[统一入库恢复说明](../../../docs/product/INTAKE-RECOVERY-SPACE-MANAGEMENT-20260913.md)。

元数据和库结构版本现从Main内部的按ID素材上下文读取；生成预览及保存前的
相关核验不再依赖整库元数据或整个入库恢复列表。原有输入与写入检查保持。
