# P06 输入与变换契约（Proposed）

## 现状与拟改边界
现行visual-ai/ocr分别在prepare里用Sharp读取Host受控预览。图片工具有显式EXIF、旋转、镜像、裁剪、缩放顺序；颜色算法另有sRGB/透明度权重。拟抽取Main内部PreparedInputService，保留这些不同能力参数；不是用同一尺寸模板覆盖全部任务。P03/P04为直接前置；关联AI-06/DATA-13/SEC-10、S00/S14索引（S14本轮未重读，不能作为新行为证明）。

## 输入与授权
prepare(scope,assetRevision,capability,inputPolicy,resourcePermit) -> PreparedInput {artifactId,digest,mime,byteLength,width,height,parentRef,sourceKind,transformChain,coordinateSpace,grantHandle}。
InputGrant只在Host私有registry有效，绑定libraryId/libraryGeneration/hostSessionId/leaseIdentity、assetId/contentKey、purpose、artifactDigest、maxReads/expiry；持久记录只留非授权来源。check前后复核当前源；URI/文件名不成为权限。拒绝任意路径、跨库复用、旧session、不同能力、超限输入及hash变化；同generation重开依P05新session撤权。

## 坐标与能力策略
以像素边界坐标[0,W]×[0,H]定义affine变换，像素中心另记 convention；不能混W与W-1。每步记录输入输出尺寸、EXIF1–8矩阵、显式rotate/flip、裁剪整数框、resize实际比例、padding偏移及正逆矩阵。M = Pad × Resize × Crop × Rotate × EXIF；四角全部映射，不只变左上角。奇异矩阵/零面积/越界裁剪拒绝，不静默扩大原件权限。
OCR返回normalized quadrilateral时先乘实际input尺寸，再用逆矩阵映回已知父图；父图是Preview时只承诺Preview坐标。缺原始EXIF/原件尺寸不补造Original坐标。OCR分块按稳定tileId与overlap保存来源，合并需独立reading-order/去重规则；本阶段不声称已实现高清分块。
视觉保留1024/JPEG85/白底兼容版本；OCR保留1600/PNG；测色保留128/sRGB/alpha histogram并标sample scope。新高清/区域策略作为新版本与新输入授权，不默认发原件。

## 预算、临时材料和回收
先读有界metadata再申请解码/转换资源；上限分别覆盖压缩字节、解码像素、帧/页/tile数、同时存在的raw buffers、临时磁盘。现有32MiB输入、视觉50M/OCR40M和OCR16MiB输出作为兼容基线，不宣称保证RAM；raw内存估计需要stride/channels/intermediate multiplier实测。权限与资源均满足才解码，缺遥测等待P07/P08保守准入。
临时文件在Host私有namespace，独占创建/受检身份，Consumer仅读指定bytes/handle。grant撤销立刻拒绝新读；GC只有owned temporary且无active holders、无evidence/recovery refs时删除；必要预览永不按普通临时GC。删除失败记待回收，不改推理成功、不扩大扫描。完整缓存归P19。

## 可执行规格测试与未来生产验收
本轮参考模型验证边界坐标EXIF旋转/镜像/裁剪缩放padding往返、退化拒绝、跨会话grant和清理谓词；不运行Sharp、不打开图片。未来T02/T05/T18需生成方向标记图测试EXIF1–8、tile边界、alpha、色彩profile、解码炸弹/截断、符号链接替换/关库撤权，以及生产OCR坐标误差。误差阈值需与实际取整策略固定，不能只用数学可逆性证明Sharp像素等价。

## 决策提案与回退
采用可追溯transform chain + scoped grant小接口；拒绝Worker自行读取文件。取舍是增加元数据，但使OCR定位与清理可审阅。版本/预算待审，未分配schema或新IPC。新链失败可用已批准旧输入版本，不改变授权范围或删旧Evidence。
