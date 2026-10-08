import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import { createActiveLibraryCommands, type ActiveLibraryCommandDependencies, type ActiveLibraryCommands } from '../local-host/active-library-commands'
export { projectHostState } from '../local-host/active-library-commands'

export interface ActiveLibraryIpcDependencies extends ActiveLibraryCommandDependencies {
  isTrustedSender?(event: IpcMainInvokeEvent): boolean
  commands?: ActiveLibraryCommands
}
export type ActiveLibraryIpcRegistrar = MainIpcHandleRegistrar

/** Desktop adapter checks the real sender before entering the shared command facade. */
export function registerActiveLibraryIpc(dependencies: ActiveLibraryIpcDependencies, registrar: ActiveLibraryIpcRegistrar): void {
  const commands = dependencies.commands ?? createActiveLibraryCommands(dependencies)
  for (const channel of commands.channels) registrar(channel, (event, ...args) => {
    if (dependencies.isTrustedSender?.(event) !== true) return { success: false, error: 'The request sender is not trusted.', code: 'UNTRUSTED_SENDER' }
    return commands.invoke(channel, ...args)
  })
}
