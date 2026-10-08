import type { IpcMainEvent } from 'electron'
import type { MainInvokeContext } from '../local-host/client-context'

// Electron's invoke payload is intentionally untyped at this seam; each handler
// validates its own request shape before touching a service.
export type MainIpcHandler = (event: MainInvokeContext, ...args: any[]) => unknown
export type MainIpcHandleRegistrar = (channel: string, handler: MainIpcHandler) => void
export type MainIpcEventListener = (event: IpcMainEvent, ...args: any[]) => void
export type MainIpcEventRegistrar = (channel: string, listener: MainIpcEventListener) => void
