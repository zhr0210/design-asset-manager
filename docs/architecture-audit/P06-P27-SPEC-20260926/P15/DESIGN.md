# P15 Preset、安装流程与配置手册（Proposed）

## 当前能力与可信目录
release-input目前没有trust root/catalog，因此本阶段可用普通模式推荐目录为空，不伪造官方ready组合。历史Qwen2B/8B只可标historical-tested范围，P03已记录语义质量未放行、当前安装/激活未核验；不因历史下载授权自动再读模型缓存或重新安装。
PresetManifest需id/revision、签名发布者/信任根、model/vision-projector/tokenizer各digest/尺寸、Runtime构建/平台条件、Profile与Recipe digest、能力测试报告、资源估计范围、许可来源URL/限制、撤回状态。签名/哈希/许可证分别验证；来源可信不等于安全执行或质量合格。catalog sequence防回退，过期信任进入需刷新而非沿用ready。

## 状态机与安装
selected→reviewed→downloading→verified-bytes→safe-extracted→installed→capability-testing→ready→active；每次状态需对应证据，/models仅protocol-reachable。真实启动仍需P09 ownership/P08许可；本轮全部NOT_RUN。
下载保存范围受限的resume metadata，固定release/hash，临时文件与活动指针分开。空间需压缩包+解包+旧版本+校验暂存峰值；不足等待不驱逐有效组合。解包拒绝绝对/驱动路径、..、符号/硬链接逃逸、大小/数量超限、重复归一化路径、未声明文件；禁止以zip entry直接作为任意宿主路径。模型数据和可执行Runtime包分别验证，普通权重不能触发执行。
能力probe使用自带非敏感样例：视觉颜色/结构、专用OCR空与文字、Embedding维度/finite值；结构probe不能认证事实质量。质量基准与硬件资源证据足够才普通模式ready，experimental可高级显式选择但不得冒充支持。

## 普通配置手册（当前可执行事实）
普通模式只展示同时满足签名目录、已验证安装、限定能力/平台报告的组合。当前目标目录缺失，显示不可用与缺少条件；用户现有外部服务仍按原手动配置流程，不能给出一键安装已可用承诺。下载前披露总字节/空间/许可来源/是否启动测试；取消不激活半成品。

## 高级配置手册（待实现字段）
用户输入服务URL/模型alias/密钥引用后先校验地址和配置版本，连接测试只表示可达；再选择具体能力、Recipe、输出/上下文参数和外发范围。未知权重/Runtime版本明确opaque；固定模型仍受资源预算，loopback可能转发。参数不兼容需报错，不静默忽略。遇到结构截断检查实际上下文/图像预算和已批准重试，不调大到无界。回退选择前一验证Profile，只改引用不删除新制品；调试导出不含Key/原文/路径。

## 验证与ADR
本轮规格测试解包路径与ready门槛；没有下载/解包真实包/安装依赖/启动样例。未来T05/T10/T14/T24需损坏签名/hash、磁盘不足、恢复/取消、macOS/Windows包与能力probe实测。S00/S01/S02/S06/S10/S11为参考索引，版本以实际Preset证据为准。
Proposed：少量验证组合优先，实验组合明确分级。模型安装、Runtime运行和质量ready分开；不能以页面或已存字节冒充闭环。
