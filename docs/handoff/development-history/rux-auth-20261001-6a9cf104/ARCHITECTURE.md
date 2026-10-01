# 当前有限实施架构（不是全项目已审计声明）

```text
DAM · Asset Workspace
├─ LibraryCanvas：全部 / 文件夹（含色板）/ 工作模式 / 回收站
│  ├─ 现有 Inspector / 原生素材窗口 / 人工描述、标签与OCR结果
│  └─ 配置 CTA → 同一导航 registry → AI 与模型
├─ AI Workspace（唯一页面归属）
│  ├─ 连接与账号 → PiConnectionsPanel（唯一连接编辑器）
│  ├─ 任务模型 → TaskModelSettings（唯一任务默认写入者）
│  ├─ 本地模型与OCR → 现有 ModelLibraryWorkspace + OCR环境选择
│  ├─ 后台分析 → 现有分析/OCR控制器（库session、资源资格仍检查）
│  └─ 高级诊断 → 生成素材有限验收；正常首页不调用旧Runtime查询
├─ 任务中心：现有下载控制（没有新建AI推理队列）
├─ Settings：普通路径偏好、快捷键与指向上述主归属的链接
└─ About：只读构建身份
    ↓ 窄 Preload / 受信 Main IPC
Main（文件、凭据、Library 与任务权限权威）
├─ Active Library Host：独占锁、Scope、Copy/Trash、用户结果写入
├─ ConnectionService：App级登录生命周期、修订绑定与提交线性化
│  ├─ CredentialVault：加密 pending/previous、有限公开投影
│  └─ PiRuntimeHost：固定Node/Pi封印、受控子进程与UNKNOWN屏障
│      └─ Worker：受限Provider/认证适配
│          ├─ ChatGPT DAM SIWC：回调→令牌→签名身份验证
│          └─ 本地/OpenAI兼容API等已准入能力（未增加Provider）
└─ Python/OCR执行器：推理；不能自行写Electron权威SQLite
```

浏览器回调不是已连接；只有Main保险库提交成功才是持久成功。身份授权与plan推理权限分开，配置不授予外发许可。账号等待不依赖Library的ready状态；关闭库仅撤销源任务，退出应用仍等待账号清理与持久提交。原AiConsole是薄兼容出口，不再有旧控制台Runtime操作面板。

图只说明本批当前代码归属。完整运行时引用、所有模块审计、真实模型质量、真实账号及用户屏幕可用性未在本批证明。
