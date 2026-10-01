# OCR owned process exit boundary

用户“继续下一轮”授权 B01 评估建议的新批次；不恢复旧队列。

A 现场调用链：asset-ocr IPC → controller 的单批 execute → runtime 冻结 handle → local-ocr-process → Main 持有 ChildProcess。只有 Host 持有的 session/lease 能写资料库。旧 fail 发 SIGKILL 后立即 reject；controller 以 job终态作为 idle；Main invalidate 没有等待。

B 实施与验收：请求结果和资源证据分开。正常 close 且协议有效才成功；取消/超时/transport错误先 SIGTERM，250ms 后仍无 exit 才用同一子进程句柄 SIGKILL，再等待总计2250ms。exit 已观察后不再signal。没有close时销毁本地transport并返回可诊断 UNKNOWN；资源 token 一直保留到迟到close，不把kill返回值当退出证明。隔离工厂未知token集合阻止新spawn。默认推理deadline60s，上限120s保持；stdout、stderr累计各1MiB。stderr从不记录内容。

C 控制器：cancel只提出取消；job仍running直到runtime settle。UNKNOWN任务failed但resource busy继续保留。prepare/configure/run前校验等待受单一preparation追踪。suspend同步撤销review/取消，drain最多5s等待preparation、execute与未知资源；失败不关闭Host。维护锁独立计数，resume不解除维护锁且未知资源仍阻止准入。关库/退出在Host close之前drain；shutdown进入draining/failed后authority完成不能恢复OCR。

D 验证层：真实stdlib Python自有进程（无模型）、事件注入故障、controller/实际Main callback隔离、真实临时Host存储/B01维护、编译后正式Electron Main/Preload/Renderer。正式测试只创建生成PNG、合成runtime manifest和stdlib transport executable，明确不是RapidOCR worker或模型。测试并发1、命令240s、单问题最多3次修复。最终逐项记录证据与限制，独立只读复核，打包后STOP。

不做：schema/公共IPC改变、UI重做、真实模型/用户库、自动背景执行、caption、全设备资源治理、安装/下载、Windows或发布。OBS-01大库聚合基准仍待单独范围。
