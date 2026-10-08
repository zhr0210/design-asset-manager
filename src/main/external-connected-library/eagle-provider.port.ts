import type { ConnectedLibraryScope, ConnectedMetadataPatch, EagleCapabilityProjection } from '../../shared/contracts/external-connected-library.contract';
export interface EagleProviderConnection {
    providerIdentity: string;
    libraryIdentity: string;
    volumeIdentity: string;
    displayName: string;
    observedGeneration: string;
    applicationVersion: string;
    buildVersion: number;
    evidenceLevel: 'synthetic-protocol' | 'provider-protocol';
    capabilities: EagleCapabilityProjection;
}
export interface EagleProviderItem {
    id: string;
    name: string;
    extension: string;
    tags: readonly string[];
    rating: number;
    annotation: string;
    folderIds: readonly string[];
    size: number;
    width: number | null;
    height: number | null;
    modifiedAt: number;
    version: string;
    contentFingerprint: string | null;
    isDeleted: boolean;
}
export interface EagleProviderPage {
    items: readonly EagleProviderItem[];
    nextCursor: string | null;
    complete: boolean;
}
/** A missing item is distinct from a failed or untrustworthy observation. */
export type EagleProviderLookupResult = {
    kind: 'found';
    item: EagleProviderItem;
} | {
    kind: 'missing';
} | {
    kind: 'unavailable';
    reason: 'timeout' | 'transport' | 'invalid-response';
};
export type EagleProviderMutationResult = {
    kind: 'applied';
    item: EagleProviderItem;
} | {
    kind: 'conflict';
    item: EagleProviderItem | null;
} | {
    kind: 'timeout';
} | {
    kind: 'unavailable';
} | {
    kind: 'unsupported';
} | {
    kind: 'rejected';
};
/** True-external seam. Production HTTP and synthetic protocol adapters both implement it. */
export interface EagleProviderPort {
    negotiate(): Promise<EagleProviderConnection | null>;
    listPage(input: {
        cursor: string | null;
        limit: number;
        scope: ConnectedLibraryScope;
    }): Promise<EagleProviderPage>;
    getItem(itemId: string): Promise<EagleProviderLookupResult>;
    readPreview(itemId: string): Promise<Uint8Array | null>;
    updateMetadata(itemId: string, patch: ConnectedMetadataPatch): Promise<EagleProviderMutationResult>;
    addFile(itemId: string, stagedFilePath: string, metadata: ConnectedMetadataPatch): Promise<EagleProviderMutationResult>;
    replaceFile(itemId: string, stagedFilePath: string, expectedFingerprint: string, desiredFingerprint: string): Promise<EagleProviderMutationResult>;
    setDeleted(itemId: string, deleted: boolean): Promise<EagleProviderMutationResult>;
    permanentlyDelete(itemId: string): Promise<EagleProviderMutationResult>;
    disconnect(): Promise<void>;
}
export interface ConnectedEditSelectionPort {
    selectEditFile(): Promise<{
        kind: 'cancelled';
    } | {
        kind: 'selected';
        filePath: string;
    }>;
}
