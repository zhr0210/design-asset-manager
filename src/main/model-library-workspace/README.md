# 正式模型管理与境内来源

正式入口是 AI 与模型 → 本地模型与 OCR。Main 的 managed-models 命名动作维护唯一 App SQLite 库存、完整制品、来源、资格与可恢复传输；Renderer 不提交任意路径、下载地址或执行资格。Host 选择器只授予当前动作需要的位置。

最新用户要求模型目录、下载和恢复使用中国境内来源。china-model-mirror.ts 直接查询 ModelScope，发现提交后重新读取固定提交目录，固定逐文件镜像 revision、长度与 SHA-256。电子网络适配器逐跳限制境内 HTTPS；Hugging Face、hf-mirror、国际 CDN 和回跳均拒绝，没有国际源 fallback。旧 huggingface-* 文件名与部分协议标识保留兼容意义，不表示当前网络来源。目录覆盖 57 个登记相关仓库；缺镜像、只提供链接、可安装、可运行与已验证各自显示，不能用目录行授予能力。

Windows x64 正式路径包含 Qwen3-VL 2B/4B/8B Instruct GGUF 的准确语言权重与视觉投影组合，CPU、完整 GPU 和混合加载分别经过实际图像验证。Transformers 2B/4B CPU 路径保留。其它型号、Thinking、FP8 等按实际状态展示，不冒称完整运行支持。共享设备采样按新鲜 RAM 和每张独立 GPU 余量推荐，并计入映射、权重、KV、计算、加载和传输成本；安装不启用，推荐适合不等于实际验证。

model-file-transfer.ts 支持精确范围恢复，只有完整长度、哈希与格式核验后才入库；暂停和重启不自行恢复。只读引用不写源目录，复制导入与下载只清理拥有归属证明的临时内容。不执行仓库 Python、pickle 或自定义代码，也不冒充 DAM 发布者签名。维护者签名目录保留其独立真实状态。

本地执行资格与远端来源新鲜度分开。已验证、文件与运行环境未漂移、未撤销信任的模型可离线继续使用；远端检查超过 24 小时本身不撤销资格。已知撤信任、许可/元数据阻止和本地损坏仍拒绝；境内镜像暂缺或网络失败不删除已保存内容。未知提交不自动重发，失败升级保留旧制品。

受管 Native 运行包使用固定 llama.cpp b11429 公开完整哈希，CPU/CUDA 包与依赖均复核。运行器的私有 loopback 凭据只由应用内部使用，不进入诊断或 Renderer。实际 close 才归还资源。已验证加载方案持久记录物理文件、运行包、计划与线程指纹；同模型、量化与输出标准内可在工作单元之间选择已验证方案，执行中冻结。明确本地 OOM 在 Host 确認未保存后最多一次低占用恢复，包含原总时限与两次调用上限，记录失败、释放、恢复及响应终态。

独立 SigLIP2 图文模型与向量空间见 retrieval-workspace；同样使用境内完整制品与真实中英文/混合及图像验证，不借用生成模型目录资格。文字索引和持久向量均由唯一 Host 管理，可重建索引不成为原件或人工内容的权威。

聚焦验证：managed-model-library、china-model-mirror、huggingface-discovery、managed-gguf-package、managed-vision-negative、ai-resource-policy 及正式应用证据。脚本与注入故障分别登记，不能替代普通启动、可见素材执行与保存重开。实际完成范围以 TASK、CURRENT-STATE 和本轮 PROGRESS 为准；父级未验收项目保持未完成。