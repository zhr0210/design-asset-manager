# Pi 接入独立复核

2026-09-30；独立 reviewer `/root/pi_final_review`，只读业务源码。用户此前明确委托独立复核；主 Agent 为业务代码唯一写者。reviewer 仅获准写 `logs/independent-*` 原始测试证据。

复核范围：批准计划、RUN-CONTRACT、before 快照、Gateway/Vault/public 投影、实际 Pi Worker 导入、Runtime Host、Main/Preload/IPC、视觉与 tags-only 调用链、资源准入/关库、配置/细化 UI 和直接调用方。

五项确认发现已修复，并由 reviewer 复核闭环：

1. Codex 原默认 API Key 不受固定 Pi Provider 支持：按真实 factory 认证表约束 UI/Main，默认 OAuth；离线 factory 元数据对比与不支持密钥写入拒绝测试通过。
2. 外部细化原全四字段序列化可能带出清单未披露的 OCR：明确只传 caption/prompt/tags；历史非空 OCR 夹具证明未外发。
3. Runtime 原只核对已列文件，额外嵌套包能遮蔽 bare import：核对实际 regular inventory 与登记链接；新增 shadow package/unsealed symlink 均拒绝。
4. 旧设置页仍将输入的秘密送 ordinary save：删除该输入并引导专用加密入口，普通设置不能写入秘密。
5. 迁移后的旧接口目录/健康探测未解析 Vault：Main-only 凭据桥、规范化非秘密配置匹配、取消与前后 fence；未保存目的地和未保存 Pi 目录候选均拒绝。未迁移旧秘密、迁移后认证目录与改地址零请求已验证。

最终独立顺序重跑：

| 记录 | 数量 | 退出码 | 超时 |
| --- | ---: | ---: | --- |
| logs/independent-resources | 2/2 | 0 | false |
| logs/independent-host | 7/7 | 0 | false |
| logs/independent-legacy-probe | 1/1 | 0 | false |

reviewer 最终结论：“独立复核通过，未发现剩余阻断缺陷。”完整原始输出和摘要保存在以上 `.log/.json`。先前独立复跑13项凭据与9项OAuth曾通过；它们在修补前运行，不作为最终源码重跑数量重复相加。

限制：合成服务、生成图、真实临时 Host、固定运行时资源布局；未验证真实模型/API/订阅账号、Keychain、Windows或签名安装包。没有以静态目录、类型或UI存在代替真实模型验收。
