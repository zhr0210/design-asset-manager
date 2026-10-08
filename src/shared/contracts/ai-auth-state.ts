import protocol from '../../../pi-runtime/auth-protocol.json'
export type AuthStage='preparing-local-storage'|'preparing-listener'|'awaiting-browser'|'callback-received'|'exchanging-code'|'verifying-identity'|'persisting-credentials'|'connected-identity'|'connected-plan'
export const AUTH_STAGES:readonly string[]=protocol.stages
export const AUTH_WORKER_STAGES:readonly string[]=protocol.workerStages
export const AUTH_ERRORS:readonly string[]=protocol.errors
export const knownAuthError=(value:unknown):value is string=>typeof value==='string'&&AUTH_ERRORS.includes(value)
export const AUTH_STAGE_LABELS:Record<AuthStage,string>={
 'preparing-local-storage':'正在检查安全存储', 'preparing-listener':'正在准备本机授权回调', 'awaiting-browser':'等待你在本机系统浏览器授权', 'callback-received':'浏览器授权已返回', 'exchanging-code':'正在交换授权凭据', 'verifying-identity':'正在验证账号身份', 'persisting-credentials':'账号已验证，正在安全保存', 'connected-identity':'账号身份已保存，计划推理未授权', 'connected-plan':'账号与计划权限已保存'
}
export function authFailureMessage(code:string):string{
 const messages:Record<string,string>={AI_AUTH_DECLINED:'你已拒绝本次授权，已有账号保持。',AI_AUTH_CALLBACK_INVALID:'授权回调无效，未保存新凭据。请重新开始登录。',AI_AUTH_REGISTRATION_INVALID:'应用注册返回无效，未保存新凭据。',AI_AUTH_IDENTITY_INVALID:'账号身份验证未通过，未保存新凭据。',AI_AUTH_KEYS_UNAVAILABLE:'身份验证公钥暂不可用，请重新授权。',AI_SECRET_STORAGE_UNAVAILABLE:'系统安全存储不可用，不能保存账号。',AI_CREDENTIAL_PERSIST_FAILED:'账号未能安全保存，请核对凭据状态后重试。',AI_CONNECTION_CHANGED:'本连接已改变，旧授权已停止。',AI_TIMEOUT:'本次登录超时，已有账号保持；请在运行 DAM 的同一台机器完成授权。',AI_PROCESS_EXIT_UNCONFIRMED:'登录进程退出尚未确认；等待资源收敛，不要重复发起。',AI_CANCELLED:'本次登录已取消，未提交的新凭据不会保存。'}
 return messages[code]??'本次登录未完成。请查看失败阶段，已有账号不会被未验证结果替换。'
}
