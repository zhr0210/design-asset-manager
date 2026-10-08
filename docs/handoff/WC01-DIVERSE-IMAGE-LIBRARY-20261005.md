# WC01 多样图片与隔离库后端验证（2026-10-05）

最新用户要求全部由Agent准备，并寻找不同、多样的图片测试。已自行获取公开样本、创建正式DAM隔离库、复制独立baseline/work、执行适用禁用状态迁移和备份验证。最终exec-04九步PASS，仓库Electron Node启动器实际exit0。第三项产品UI/Computer Use仍按先前明确要求排除；没有寻找或访问现有私人库、账号、模型或Provider。完成STOP，不自动下一批。

证据入口：本机.scratch/wc01-diverse-image-library-20261005/run-efo39hjx/terminal-anchor.json。该锚点固定最终日志、候选字节、实际数据与Runtime身份、默认Router复核和独立复核。旧批次锚点不重写。

## 实际数据与调用链

25个公开上游样本来自imageio/imageio-binaries和lovell/sharp；固定repo commit、Git blob SHA1（含blob header）、字节大小及SHA256。raw域名TLS未完成后改用同一公开Git blob API取同一对象，不关闭TLS验证、不切换未知样本。总下载3099053 bytes，没有模型/AI依赖下载。另在本机从公开样本生成6个明确标记的派生输入：摄影WebP、4096×3072大图、6000×240极宽图、中文路径/扩展名与实际PNG内容不一致，以及两个截断输入。派生样本不冒充上游原件。

样本覆盖人物、动物、食物、材质、灰度物体/文字、低对比度、EXIF6/8、CMYK/ICC、透明/灰度透明、宽色域、2×2、16-bit、动画WebP/GIF、TIFF、AVIF、SVG、损坏输入。contact-sheet.png只是受控来源缩略总览，不是产品截图或Computer Use证据。

实际入口：node scripts/run-electron-node-test.mjs scripts/fixtures/wc01-diverse-image-library.test.ts。复用createActiveLibraryHost(createProductionActiveLibraryHostDependencies(dialog,{admission}))；只有目录/文件选择dialog由受控路径提供。当前volume、exclusive lease、默认VisualAdmission、SQLite、Windows pinned native backup、空间/资源/句柄/事务/物理退出门均执行，没有storage/native/volume资格替代，没有SQLITE_USE_URI测试覆盖。直接Host调用归后台接线测试。

## Before / After 与结果

| 项目 | 本轮前 | 本轮后可证明行为 |
| --- | --- | --- |
| 测试材料 | 等待用户准备副本 | Agent准备25公开+6派生样本，并正式建库、普通复制；用户无需准备本批材料 |
| 原图codec | 既有生成样本/隔离矩阵证据 | 31样本中21准备合格JPEG，10按当前格式/depth/pages/损坏限制局部拒绝；每次结束OCR/Pi资源许可可申请并归零，不调用模型 |
| 正式Copy/Preview/Promotion | 既有合成小图证据 | 24支持图片全部Promotion；GIF/TIFF/AVIF/SVG四个计划内排除，不阻塞正常批次；3坏图停在Candidate、不Promotion，后续正常图仍可入库并重开 |
| 图像保真边界 | 未覆盖本批数据 | 原件SHA不变；内容检测格式、EXIF方向/比例、≤1600预览/≤1024 AI JPEG、真正透明像素保持、16-bit规范预览均核对；动画WebP预览只取当前实现的首帧，原件动画字节保持 |
| Windows备份 | 正式临时生成库矩阵 | 新建自然v1磁盘库229376 bytes，独立work-analysis一次全部能力关闭的v1→12，完整v1备份229376 bytes；v12库520192 bytes再次独立复制后work-ocr一次OCR关闭的v12→13，完整v12备份520192 bytes |
| 用户状态与结算 | 本批材料未验证 | harness核对v1既有14表字段/行摘要和身份不变；独立只读复核另按v12 source全部39表的原列重新计算count+hash，39/39在OCR升级后保持。协议journal仅新增适用settled backup marker。schema、完整性/FK、禁用策略、baseline字节、原件/预览、关闭重开和全部账本0核对 |

所有初始物理/SQLite页大小都自然≤1048576 bytes；最终v13为548864 bytes。没有改版本号、降级、删行、VACUUM或放宽资格。baseline没有作为正式Host打开；普通文件复制且所有文件regular/link1，无symlink/junction/hardlink。每个work只做一次适用迁移，原source-library-v1保持v1与原用户表摘要。用户状态由正式接口创建的编辑描述、确认标签、别名、标签关系组成；没有伪造AI推理结果。

## 保留失败与新harness纠正

准备期两次raw域名TLS失败保留；第三次同一公开blob对象取回成功。exec01新harness漏传正式sessionToken，现有源版本/session门正确拒绝；补齐真实Host返回token。exec02新oracle误把hasAlpha标志等同实际透明像素：P3与动画WebP首帧alpha全255，编码可省去未使用通道；改为源确有非不透明像素时同时要求预览alpha通道及实际非不透明像素，原件SHA仍严格保持。exec03新harness把Node Buffer交给只接受plain Uint8Array的生产manifest reader，正确拒绝；改new Uint8Array，不放宽生产输入门。原FAIL、原harness/新harness SHA和修正说明保留，最终exec04重新走完整九步。

没有修改产品源码、旧失败测试/断言、安全阈值或16k预算。新测试入口与本报告明确进入本批候选闭包但未stage，原63文件Router index保持，无commit/push/发布、自动恢复或清理。

默认Router本轮重新验证268场景、context:check、agent-context、普通/continuity/Real Model Path三路由、ADR Router和docs phase-summary，8项全部exit0，使用真实默认index且index字节不变；ownership为708/708，三路预算分别6199/7660/15952，均在16000内。governance.json与每项stdout/stderr保留，Real Model Path路由检查不代表运行模型。

独立复核使用Electron30.5.1只读9个受控测试数据库，核对文件SHA、表摘要、quick_check/FK、身份、禁用策略与settled commit marker。v13 harness current摘要本身只覆盖v1的14张原表；上述v12全部39张原表保持由独立只读查询补足。另核对25个公共来源对象身份、24个原件/预览SHA、4个实际透明来源的预览透明像素，以及v1/v12到baseline的51/56文件字节相同且inode不同。该复核不打开私人库、不修改测试数据库；最终签名记录从终态锚点读取。

## 身份、未验证与接手

HEAD b5cc954f90d248694aedc2d6ca1aa5188fa0aa11，branch codex/windows-workspace-1001；index a15e17ebf7ccf5fc372772ec11b867a2ca4cf50b6b59750b2cb3d60c7b7bfb1c。产品build仍dam-2872f61d4321786c，sourceDigest2872f61d4321786cf5f6d39462c609777c552bdfd22467a21f7644049724cd3e；688输入/14输出及native字节由终态复核，没有重构建。native bundle-VMRDqd / manifest4023c30f82aa8db0a5fa459aece908db7cbe4b1b49d51036bcddc563c0e89112。

实际测试Runtime Windows x64 / Electron30.5.1 / Node20.16.0 / ABI123 / NAPI9 / SQLite3.53.1。Pi保持win32-x64 / Node24.21.0 / SDK0.99.1源码release身份，本轮未启动Pi或模型。产品UI进程NOT_OBSERVED，Computer Use NOT_RUN，不把文件总览、后台Host调用或资源许可称作UI/真实推理通过。

测试层级是公开真实图片的新建隔离磁盘库；现有私人旧库、任意超界profile、安装包、本轮macOS、真实模型、kernel/断电/自动restore仍未验证。首次真实库准备计划仅作为历史保留，不再要求用户为本批准备材料。

Remote Desktop Commander先读本轮terminal-anchor，再读exec-04/result.json、migration-v1-v12.json、migration-v12-v13.json、production-intake.json和当前TASK；若续接必须使用新执行编号，保留原文件，不自动打开私人库或进入第三项。下一批仅为建议：如需确认真实用户界面，再单独明确恢复第三项的受控profile和路径；本批无需追加执行。
