import type { WorkspaceTransport } from '../shared/client/workspace-transport'
import { WorkspaceConnectionError } from '../shared/client/workspace-connection-error'
import { isWorkspaceReadCommand } from '../shared/client/workspace-read-commands'

/** Browser has only named product calls; no queue or retry for uncertain writes. */
export async function createBrowserTransport(): Promise<WorkspaceTransport> {
  const response = await fetch('/api/session-info', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw Error('连接授权已失效，请重新使用 DAM 浏览器版入口。')
  const { csrf, clientId } = await response.json()
  const listeners = new Map<string, Set<(...args: any[]) => void>>()
  const reconcilers = new Set<() => Promise<void>>()
  let connected = false, reconciling = true, sequence = 0
  let invocationSequence = 0
  const emit = (name: string, payload: unknown) => {
    for (const listener of listeners.get(name) ?? []) listener(undefined, payload)
  }
  const events = new EventSource(`/api/events?client=${encodeURIComponent(clientId)}`)
  window.addEventListener('pagehide', event => {
    if (event.persisted) return
    events.close()
    navigator.sendBeacon('/api/client-close', new Blob([JSON.stringify({ csrf, clientId })], { type: 'application/json' }))
  })
  events.onmessage = event => {
    const { name, payload } = JSON.parse(event.data)
    emit(name, payload)
  }
  async function invoke(command: string, ...args: unknown[]) {
      if ((!connected || reconciling) && !isWorkspaceReadCommand(command) && command!=='workspace:ready') throw Error('本机连接尚未校准，操作未执行。请等待重新连接并核对当前状态。')
      while (args.length && args[args.length - 1] === undefined) args.pop()
      let result: Response
      try {
        result = await fetch('/api/command', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'X-DAM-CSRF': csrf, 'X-DAM-Client': clientId, 'X-DAM-Invocation': String(++invocationSequence) },
          body: JSON.stringify({ command, args })
        })
      } catch {
        // The Host may have committed before the response was lost.
        throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。')
      }
      if (!result.ok) {
        if (result.status === 403) throw new WorkspaceConnectionError('连接授权已失效，请重新使用 DAM 浏览器版入口。')
        if (result.status === 404) return { success: false, code: 'CAPABILITY_UNAVAILABLE', error: '此操作尚未适配浏览器端。' }
        const failure = await result.json().catch(() => null)
        if (failure?.code === 'COMMAND_RECEIPT_UNKNOWN') throw new WorkspaceConnectionError('操作结果尚未确认。请检查保存结果，勿重复提交。')
        throw Error(failure?.error || '操作未完成，请检查当前状态后重试。')
      }
      try {
        return JSON.parse(await result.text(), (_key, item) => {
          if (item && typeof item.$damBinary === 'string' && Object.keys(item).length === 1) return Uint8Array.from(atob(item.$damBinary), character => character.charCodeAt(0))
          return item
        }).value
      }
      catch { throw new WorkspaceConnectionError('未收到完整回执。请检查保存结果，勿重复提交。') }
  }
  const reconcile = async () => {
    const version = ++sequence
    connected = false; reconciling = true; emit('workspace:connection',{connected:false,reconciling:true})
    try {
      const snapshots = await Promise.all(['library:inspect','settings:load','download:list','download:jobs','connected-library:inspect','legacy-readonly:inspect','ai-connection:active-logins'].map(command => invoke(command)))
      if(snapshots.some(value => value?.success === false || value?.ok === false)) throw Error('WORKSPACE_RECONCILIATION_FAILED')
      await Promise.all([...reconcilers].map(listener=>listener()))
      if (version !== sequence) return
      reconciling = false; connected = true
      emit('workspace:connection',{connected:true,reconciling:false})
      for (const name of ['settings:changed','connected-library:changed','drafts:changed']) emit(name,null)
    } catch { if(version===sequence){connected=false;reconciling=false;emit('workspace:connection',{connected:false,reconciling:false})} }
  }
  events.addEventListener('connected', () => { void reconcile() })
  events.onerror = () => { ++sequence; connected = false; reconciling = false; emit('workspace:connection', { connected: false, reconciling:false }) }
  return {
    invoke,
    onReconcile(listener) { reconcilers.add(listener); return () => { reconcilers.delete(listener) } },
    connectionState: () => ({connected,reconciling}),
    on(channel, listener) {
      if (!listeners.has(channel)) listeners.set(channel, new Set())
      listeners.get(channel)!.add(listener)
    },
    removeListener(channel, listener) { listeners.get(channel)?.delete(listener) },
    mediaUrl(reference) {
      const media=/^dam-workmedia:\/\/media\/([^?#]+)$/.exec(reference)
      if(media&&[4,5].includes(media[1].split('/').length))return '/media/work/'+media[1]
      if (/^\/media\/(?:active|connected|legacy)\/[A-Za-z0-9%._:~/-]+$/.test(reference)) return reference
      const match = /^dam-(preview|connected-preview|legacy-preview):\/\/preview\/([^?#]+)$/.exec(reference)
      if (!match || match[2].split('/').length !== 3) return ''
      const kind = match[1] === 'preview' ? 'active' : match[1] === 'connected-preview' ? 'connected' : 'legacy'
      return `/media/${kind}/${match[2]}`
    }
  }
}
