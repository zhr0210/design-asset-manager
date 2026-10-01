import type { IpcMainInvokeEvent } from 'electron'
import { CHANNEL_ASSET_CARD_ACTION, CHANNEL_ASSET_CARD_INSPECT, CHANNEL_ASSET_CARD_OPEN, CHANNEL_ASSET_CARD_DRAFT } from '../../shared/contracts/asset-card.contract'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { MainIpcHandleRegistrar } from './ipc-registrar'

export function registerAssetCardIpc(input: {
  card: ReturnType<typeof createAssetCardController>
  isMainSender(event: IpcMainInvokeEvent): boolean
  handle: MainIpcHandleRegistrar
}) {
  input.handle(CHANNEL_ASSET_CARD_OPEN, (event, request) => input.isMainSender(event) ? input.card.open(request) : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_DRAFT, (event, request) => input.isMainSender(event) ? input.card.syncDraft(request) : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_INSPECT, event => input.card.isTrusted(event) ? { ok: true, state: input.card.inspect() } : { ok: false, code: 'UNTRUSTED_SENDER' })
  input.handle(CHANNEL_ASSET_CARD_ACTION, (event, action) => input.card.isTrusted(event) ? input.card.act(action) : { ok: false, code: 'UNTRUSTED_SENDER' })
}
