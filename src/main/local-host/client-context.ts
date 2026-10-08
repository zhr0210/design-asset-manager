import type { IpcMainInvokeEvent } from 'electron'
import { AsyncLocalStorage } from 'node:async_hooks'

/** Created by Host authentication, never deserialized from a request body. */
export interface BrowserClientContext {
  readonly kind: 'browser-client'
  readonly id: string
  readonly role: 'workspace'
}
export type MainInvokeContext = IpcMainInvokeEvent | BrowserClientContext
export const clientRequestScope = new AsyncLocalStorage<MainInvokeContext>()

export function isBrowserContext(context: MainInvokeContext): context is BrowserClientContext {
  return 'kind' in context && context.kind === 'browser-client'
}

export function workspaceOwner(context: MainInvokeContext): string {
  return isBrowserContext(context) ? `client:${context.id}` : 'main'
}
/** These owners are created only after the formal IPC/HTTP workspace-role check. */
export const isWorkspaceOwner=(owner:string)=>owner==='main'||owner.startsWith('client:')
