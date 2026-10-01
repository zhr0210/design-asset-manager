# Remote 增量交接起点

这是R00–R08的**有限代码与隔离验证交接**，不是全功能可用或订阅登录成功交付。

先读FINAL-HANDOFF.json→REPORT.md→REVIEW.md→ACCEPTANCE-SUMMARY.md。源码668项摘要在SOURCE-MANIFEST；本批77项增量在DELTA；after为可审查的新文件正文，before保留必要旧WIP，changes.patch仅本批变化。不要用Git HEAD替代before，不全量覆盖、reset或clean。index/staged未动；原用户修改保留。

ARCHITECTURE/FEATURE-ROUTES/UI-OWNERSHIP描述当前代码归属。DELETION-LEDGER/REMOVAL-PROOF/静态图描述5删除和2测试支持迁移。logs包含所有红绿producer日志和只读独立审查；不要改旧失败记录，也不要把producer引用算独立重跑。

CU-RUNS、REAL-AUTH-ACCEPTANCE分别保持BLOCKED/NOT_RUN，没有最终接受的屏幕截图。先等用户退出个人测试软件，使用受控原生profile从首页开始；账号场景要有受控假网络，禁止当前普通launcher自动登录或推理。真实账号再由用户本机厂商浏览器辅助。旧Runtime源码策略红灯独立保留。

MANIFEST-SHA256逐文件验证交接包，ZIP-SHA256验证压缩文件。包不含依赖、Runtime二进制、个人数据或历史ZIP；与真实原仓库baseline合并才能运行。STOP；不自动下一批。
