import type { IpcMainInvokeEvent } from 'electron'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { createImageToolsController } from '../image-tools/image-tools-controller'

export function registerImageToolsIpc(deps: { controller?: ReturnType<typeof createImageToolsController>; card?: ReturnType<typeof createAssetCardController>; isMain(event: IpcMainInvokeEvent): boolean; handle: MainIpcHandleRegistrar }) {
  for (const action of ['prepare', 'save', 'discard'] as const) deps.handle(`image-tools:${action}`, async (event, input) => {
    try {
      if (!deps.controller) throw new Error('图片工具当前不可用。')
      const main = deps.isMain(event)
      const card = !main && deps.card?.isTrusted(event) ? deps.card.inspect() : null
      if (!main && !card) throw new Error('当前窗口没有图片工具权限。')
      if (card && action === 'prepare' && (!input || input.assetId !== card.context.assetId || input.libraryIdentity !== card.context.libraryIdentity || input.generation !== card.context.generation)) throw new Error('卡片只能处理当前素材。')
      const owner = main ? 'main' : `card:${card!.token}`
      const value = action === 'prepare' ? await deps.controller.prepare(owner, input) : action === 'save' ? await deps.controller.save(owner, input) : deps.controller.discard(owner, input)
      return { ok: true, value }
    } catch (error) { return { ok: false, error: error instanceof Error && !/[\n/\\]|https?:|data:/.test(error.message) ? error.message : '图片工具操作未完成，请重试。' } }
  })
}
