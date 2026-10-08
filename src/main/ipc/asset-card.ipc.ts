import type { MainInvokeContext as IpcMainInvokeEvent } from '../local-host/client-context'
import { CHANNEL_ASSET_CARD_ACTION, CHANNEL_ASSET_CARD_INSPECT, CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_DRAFT } from '../../shared/contracts/asset-card.contract'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import { isBrowserContext } from '../local-host/client-context'

export function registerAssetCardIpc(input: {
  card: ReturnType<typeof createAssetCardController>
  isMainSender(event: IpcMainInvokeEvent): boolean
  handle: MainIpcHandleRegistrar
}) {
  const owner = (event: IpcMainInvokeEvent) => isBrowserContext(event) ? `client:${event.id}` : `native:${event.sender?.id ?? 0}`
  input.handle(CHANNEL_ASSET_CARD_OPEN, (event, request) => input.isMainSender(event) ? input.card.open(request, owner(event)) : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_DRAFT, (event, request) => input.isMainSender(event) ? input.card.syncDraft(request, owner(event)) : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_INSPECT, event => input.card.isTrusted(event) ? { ok: true, state: input.card.inspect() } : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_ACTION, (event, action) => input.card.isTrusted(event) ? input.card.act(action) : { ok: false, code: 'UNTRUSTED_SENDER' })
}
