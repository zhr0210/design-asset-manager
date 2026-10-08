import React from 'react'
import type { AiBackendConfig } from '../../../shared/types/ai-backend.types'
import { Button, Notice } from '../ui/WorkspacePrimitives'
const capabilityLabels: Record<string, string> = { chat: '聊天', vision: '图像输入', embeddings: '向量检索', jsonOutput: '结构化结果', modelList: '模型列表', modelManagement: '模型管理' }

/** A new configuration has no claim on the old connection's credentials or proof. */
export function copyBackendConfiguration(draft: AiBackendConfig, id: string): AiBackendConfig {
  const { apiKey, credentialRef, credentialRevision, modelValidation, ...configuration } = draft
  return { ...configuration, id }
}

export default function BackendConfigConflict({ current, busy, onAdopt, onCopy }: {
  current?: AiBackendConfig; busy: boolean; onAdopt(): void; onCopy(): void
}) {
  return <Notice>
    {current ? <>
      <p>此服务配置已在另一界面修改。你的输入仍保留，请核对后再保存。</p>
      <details><summary>核对当前已保存的服务配置</summary><dl className="ui-meta" style={{ overflowWrap: 'anywhere' }}>
        <dt>名称</dt><dd>{current.name}</dd><dt>类型</dt><dd>{current.type}</dd>
        <dt>服务地址</dt><dd>{current.baseUrl}</dd><dt>默认模型</dt><dd>{current.defaultModel || '未指定'}</dd>
        <dt>启用状态</dt><dd>{current.enabled ? '已启用' : '未启用'}</dd>
        <dt>处理位置</dt><dd>{current.processingLocation === 'local-service' ? '本机服务' : current.processingLocation === 'external-service' ? '外部服务' : '未指定'}</dd>
        <dt>提供方 / 认证</dt><dd>{current.providerKind || '兼容接口'} / {current.authMode || '未指定'}</dd>
        <dt>执行接口</dt><dd>{current.transport === 'pi' ? 'Pi 统一接口' : '已有兼容接口'}</dd>
        <dt>超时 / 优先级</dt><dd>{current.timeoutMs / 1000} 秒 / {current.priority}</dd>
        <dt>能力声明</dt><dd>{Object.entries(current.capabilities).filter(([, enabled]) => enabled).map(([name]) => capabilityLabels[name] || name).join('、') || '暂无'}</dd>
        {current.notes && <><dt>备注</dt><dd>{current.notes}</dd></>}
      </dl><p>凭据继续由 DAM 安全管理；保存配置不会覆盖另一界面更新的凭据。</p></details>
      <Button disabled={busy} onClick={onAdopt}>核对后采用当前服务配置为基准</Button>
    </> : <>
      <p>此服务配置已在另一界面移除。你的输入仍保留，可以另存为新服务或取消修改。</p>
      <Button disabled={busy} onClick={onCopy}>将输入另存为新服务</Button>
    </>}
  </Notice>
}
