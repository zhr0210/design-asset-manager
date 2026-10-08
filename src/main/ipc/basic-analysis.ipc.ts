import { workspaceOwner, type MainInvokeContext } from '../local-host/client-context'
import {
  basicMessage,
  type createBasicAnalysisController,
} from '../background-analysis/basic-analysis-controller'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
export function registerBasicAnalysisIpc(d: {
  controller?: ReturnType<typeof createBasicAnalysisController>
  card?: ReturnType<typeof createAssetCardController>
  isMain(e: MainInvokeContext): boolean
  handle: MainIpcHandleRegistrar
}) {
  const bind = (name: string, scoped: boolean, action: (owner: string, input: any) => unknown) =>
    d.handle('basic-analysis:' + name, async (event, input) => {
      try {
        if (!d.controller) throw Error('BASIC_UNAVAILABLE')
        const main = d.isMain(event),
          card = !main && d.card?.isTrusted(event) ? d.card.inspect() : null
        if (!main && !card) throw Error('BASIC_SCOPE_EXPIRED')
        if (
          card &&
          scoped &&
          (!input ||
            input.libraryIdentity !== card.context.libraryIdentity ||
            input.generation !== card.context.generation ||
            (input.assetId !== undefined
              ? input.assetId !== card.context.assetId
              : input.assetIds?.length !== 1 || input.assetIds[0] !== card.context.assetId))
        )
          throw Error('BASIC_SCOPE_EXPIRED')
        return { ok: true, value: await action(main ? workspaceOwner(event) : `card:${card!.token}`, input) }
      } catch (e) {
        return { ok: false, error: basicMessage(e) }
      }
    })
  bind('prepare', true, (o, i) => d.controller!.prepare(o, i))
  bind('run', false, (o, i) => d.controller!.run(o, i))
  bind('discard', false, (o, i) => d.controller!.discard(o, i))
  bind('inspect', false, (o, i) => d.controller!.inspect(o, i))
  bind('cancel', false, (o, i) => d.controller!.cancel(o, i))
  bind('captions', true, (_o, i) => d.controller!.captions(i))
  bind('attempts', true, (_o, i) => d.controller!.attempts(i))
  bind('recover', true, (_o, i) => d.controller!.recover(i))
}
