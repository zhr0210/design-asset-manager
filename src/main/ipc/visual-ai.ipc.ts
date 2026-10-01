import { CHANNEL_VISUAL_AI_PREPARE, CHANNEL_VISUAL_AI_RUN, CHANNEL_VISUAL_AI_INSPECT, CHANNEL_VISUAL_AI_CANCEL, CHANNEL_VISUAL_AI_RESULTS, CHANNEL_VISUAL_AI_BACKENDS, CHANNEL_VISUAL_AI_CONFIRM_TAG } from '../../shared/contracts/visual-ai.contract'
import type { VisualAiPrepareRequest, VisualAiScope } from '../../shared/contracts/visual-ai.contract'
import type { createVisualAiController } from '../visual-ai/visual-ai-controller'
import type { createAssetCardController } from '../asset-card/asset-card-controller'
import type { MainIpcHandleRegistrar } from './ipc-registrar'
import type { IpcMainInvokeEvent } from 'electron'

export function registerVisualAiIpc(deps: { controller?: ReturnType<typeof createVisualAiController>; card?: ReturnType<typeof createAssetCardController>; isMain(event: IpcMainInvokeEvent): boolean; handle: MainIpcHandleRegistrar }) {
  const handle = (channel: string, operation: (owner: string, input: any) => unknown, scoped = false) => deps.handle(channel, async (event, input) => {
    try {
      if (!deps.controller) throw new Error('AI 功能当前不可用。')
      const isMain = deps.isMain(event)
      const card = !isMain && deps.card?.isTrusted(event) ? deps.card.inspect() : null
      if (!isMain && !card) throw new Error('当前窗口没有分析权限。')
      if (card && scoped) {
        const request = input as VisualAiPrepareRequest & VisualAiScope & { assetId?: string }
        if (!request || request.libraryIdentity !== card.context.libraryIdentity || request.generation !== card.context.generation ||
          (request.assetId !== undefined ? request.assetId !== card.context.assetId : request.assetIds?.length !== 1 || request.assetIds[0] !== card.context.assetId)) throw new Error('悬浮卡片只能分析当前素材。')
      }
      const value = await operation(isMain ? 'main' : `card:${card!.token}`, input)
      return { ok: true, value }
    } catch (error) { return { ok: false, error: error instanceof Error && !/\n|https?:|data:|[/\\]/.test(error.message) ? error.message : 'AI 操作未完成，请重新检查配置与素材。' } }
  })
  handle(CHANNEL_VISUAL_AI_BACKENDS, () => deps.controller!.backends())
  handle(CHANNEL_VISUAL_AI_PREPARE, (owner, input) => deps.controller!.prepare(owner, input), true)
  handle('visual-ai:discard-review',(owner,receipt)=>deps.controller!.discardReview(owner,receipt))
  handle(CHANNEL_VISUAL_AI_RUN, (owner, receipt) => deps.controller!.run(owner, receipt))
  handle(CHANNEL_VISUAL_AI_INSPECT, (owner, id) => deps.controller!.inspect(owner, id))
  handle(CHANNEL_VISUAL_AI_CANCEL, (owner, id) => deps.controller!.cancel(owner, id))
  handle(CHANNEL_VISUAL_AI_RESULTS, (_owner, input) => deps.controller!.results(input), true)
  handle(CHANNEL_VISUAL_AI_CONFIRM_TAG, (_owner, input) => deps.controller!.confirmTag(input), true)
}
