import { CHANNEL_LEGACY_CLOSE, CHANNEL_LEGACY_CONFIRM, CHANNEL_LEGACY_INSPECT, CHANNEL_LEGACY_LIST, CHANNEL_LEGACY_MEDIA_PREVIEW, CHANNEL_LEGACY_PREPARE, CHANNEL_LEGACY_SEARCH } from '../contracts/legacy-readonly-workspace.contract'

export function createLegacyReadOnlyWorkspaceClient(invoker: { invoke(channel: string, request?: unknown): Promise<any> }) {
  const invoke = async (channel: string, request?: unknown) => {
    const result = request === undefined ? await invoker.invoke(channel) : await invoker.invoke(channel, request)
    return result?.success ? result.value : result
  }
  return Object.freeze({
        legacyReadonly: {
            inspect: () => invoke(CHANNEL_LEGACY_INSPECT),
            prepare: () => invoke(CHANNEL_LEGACY_PREPARE),
            confirm: (receipt: string) => invoke(CHANNEL_LEGACY_CONFIRM, { receipt  }),
            list: () => invoke(CHANNEL_LEGACY_LIST),
            search: (query: string) => invoke(CHANNEL_LEGACY_SEARCH, { query  }),
            readPreview: (assetId: string, identity: string, generation: string) => invoke(CHANNEL_LEGACY_MEDIA_PREVIEW, { assetId, identity, generation  }),
            close: () => invoke(CHANNEL_LEGACY_CLOSE)
        },
  })
}
