import type { EagleProviderPort } from './eagle-provider.port';
/** Fail-closed production placeholder until an explicit reviewed pairing supplies a provider. */
export function createUnavailableEagleProvider(): EagleProviderPort {
    return Object.freeze({
        negotiate: async () => null,
        listPage: async () => { throw new Error('EAGLE_PROVIDER_UNAVAILABLE'); },
        getItem: async () => ({ kind: 'unavailable' as const, reason: 'transport' as const }),
        readPreview: async () => null,
        updateMetadata: async () => ({ kind: 'unavailable' as const }),
        addFile: async () => ({ kind: 'unavailable' as const }),
        replaceFile: async () => ({ kind: 'unavailable' as const }),
        setDeleted: async () => ({ kind: 'unavailable' as const }),
        permanentlyDelete: async () => ({ kind: 'unsupported' as const }),
        disconnect: async () => undefined
    });
}
