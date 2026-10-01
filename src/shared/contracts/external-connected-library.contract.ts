/** Path-free public contract for a library whose Original authority stays in Eagle. */
export type ConnectedLibraryState = 'unconfigured' | 'review-required' | 'connecting' | 'indexing' | 'ready' | 'disconnected' | 'conflict' | 'recovery-required' | 'closed';
export type ConnectedLibraryEvidenceLevel = 'not-connected' | 'synthetic-protocol' | 'provider-protocol';
export type ConnectedLibraryScope = {
    kind: 'all';
} | {
    kind: 'folders';
    folderIds: readonly string[];
};
export interface EagleCapabilityProjection {
    webApiV2: boolean;
    progressiveIndex: boolean;
    metadataRead: boolean;
    metadataWrite: boolean;
    trash: boolean;
    restore: boolean;
    fileReplace: boolean;
    permanentDelete: boolean;
}
export interface ConnectedLibraryProjection {
    state: ConnectedLibraryState;
    evidenceLevel: ConnectedLibraryEvidenceLevel;
    provider: 'eagle';
    providerIdentity: string | null;
    libraryIdentity: string | null;
    generation: string | null;
    displayName: string | null;
    originalAuthority: 'eagle-single-original';
    scope: ConnectedLibraryScope | null;
    grant: 'none' | 'read-only' | 'read-write';
    capabilities: EagleCapabilityProjection | null;
    counts: {
        indexed: number;
        inScope: number;
        pending: number;
        conflicts: number;
        trashed: number;
        cleanupCandidates: number;
    };
    cursor: string | null;
    indexingComplete: boolean;
}
export interface ConnectedLibraryReview {
    receipt: string;
    provider: 'eagle';
    displayName: string;
    providerIdentity: string;
    libraryIdentity: string;
    observedGeneration: string;
    scope: ConnectedLibraryScope;
    capabilities: EagleCapabilityProjection;
    originalPolicy: 'eagle-remains-the-only-original-authority';
    localStoragePolicy: readonly [
        'index-and-sync-journal',
        'quota-bounded-rebuildable-preview-cache',
        'pending-edit-staging-only'
    ];
    requestedGrant: 'read-only' | 'read-write';
    confirmable: boolean;
    limitations: readonly string[];
}
export interface ConnectedLibraryItemProjection {
    key: string;
    providerItemId: string;
    title: string;
    extension: string;
    tags: readonly string[];
    rating: number;
    annotation: string;
    folderIds: readonly string[];
    size: number;
    width: number | null;
    height: number | null;
    providerModifiedAt: number;
    providerVersion: string;
    contentFingerprint: string | null;
    previewRef: string | null;
    originalAvailability: 'available-through-provider' | 'mounted-read-only' | 'offline' | 'permanently-missing';
    lifecycle: 'active' | 'trash' | 'tombstone' | 'out-of-scope';
    sync: 'clean' | 'pending' | 'conflict';
}
export type ConnectedMetadataField = 'name' | 'tags' | 'rating' | 'annotation' | 'folderIds';
export interface ConnectedMetadataPatch {
    name?: string;
    tags?: readonly string[];
    rating?: number;
    annotation?: string;
    folderIds?: readonly string[];
}
export type ConnectedOperationKind = 'metadata' | 'replace-file' | 'trash' | 'restore' | 'add-file';
export interface ConnectedOperationProjection {
    operationId: string;
    clientReceipt: string;
    itemKey: string;
    kind: ConnectedOperationKind;
    state: 'pending' | 'checking' | 'committed' | 'conflict' | 'held' | 'failed';
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface ConnectedConflictProjection {
    conflictId: string;
    itemKey: string;
    operationId: string;
    kind: 'field' | 'file' | 'delete-versus-edit' | 'library-changed' | 'volume-changed' | 'result-uncertain';
    field: ConnectedMetadataField | null;
    state: 'unresolved' | 'use-local' | 'use-eagle' | 'held' | 'resolved';
    localSummary: string;
    eagleSummary: string;
    createdAt: string;
}
export interface ConnectedCleanupCandidateProjection {
    itemKey: string;
    eligibleAt: string;
    blockedBy: 'none' | 'pending-sync' | 'conflict' | 'provider-unsupported';
    confirmable: boolean;
}
export interface ConnectedIndexPageResult {
    indexed: number;
    nextCursor: string | null;
    complete: boolean;
    projection: ConnectedLibraryProjection;
}
export interface ExternalConnectedLibrary {
    inspect(): ConnectedLibraryProjection;
    prepareConnection(input: {
        scope: ConnectedLibraryScope;
        requestedGrant: 'read-only' | 'read-write';
    }): Promise<{
        kind: 'planned';
        review: ConnectedLibraryReview;
    } | {
        kind: 'unavailable';
    }>;
    confirmConnection(receipt: string): Promise<ConnectedLibraryProjection>;
    indexNextPage(limit?: number): Promise<ConnectedIndexPageResult>;
    listItems(): Promise<readonly ConnectedLibraryItemProjection[]>;
    searchItems(query: string): Promise<readonly ConnectedLibraryItemProjection[]>;
    queueMetadata(input: {
        itemKey: string;
        clientReceipt: string;
        patch: ConnectedMetadataPatch;
    }): Promise<ConnectedOperationProjection>;
    prepareNewAsset(input?: {
        metadata?: ConnectedMetadataPatch;
    }): Promise<{
        kind: 'cancelled';
    } | {
        kind: 'staged';
        item: ConnectedLibraryItemProjection;
        operation: ConnectedOperationProjection;
        stagedBytes: number;
    }>;
    prepareFileReplacement(input: {
        itemKey: string;
    }): Promise<{
        kind: 'cancelled';
    } | {
        kind: 'staged';
        operation: ConnectedOperationProjection;
        stagedBytes: number;
    }>;
    queueLifecycle(input: {
        itemKey: string;
        clientReceipt: string;
        action: 'trash' | 'restore';
    }): Promise<ConnectedOperationProjection>;
    synchronize(limit?: number): Promise<ConnectedLibraryProjection>;
    listOperations(): Promise<readonly ConnectedOperationProjection[]>;
    listConflicts(): Promise<readonly ConnectedConflictProjection[]>;
    resolveConflict(input: {
        conflictId: string;
        decision: 'use-local' | 'use-eagle' | 'hold';
    }): Promise<ConnectedConflictProjection>;
    listCleanupCandidates(): Promise<readonly ConnectedCleanupCandidateProjection[]>;
    confirmPermanentCleanup(input: {
        itemKey: string;
        clientReceipt: string;
    }): Promise<ConnectedOperationProjection>;
    readPreview(itemKey: string): Promise<Uint8Array>;
    disconnect(): Promise<void>;
    close(): Promise<void>;
}
export const CHANNEL_CONNECTED_INSPECT = 'connected-library:inspect';
export const CHANNEL_CONNECTED_PREPARE = 'connected-library:prepare';
export const CHANNEL_CONNECTED_CONFIRM = 'connected-library:confirm';
export const CHANNEL_CONNECTED_INDEX_NEXT = 'connected-library:index-next';
export const CHANNEL_CONNECTED_LIST = 'connected-library:list';
export const CHANNEL_CONNECTED_SEARCH = 'connected-library:search';
export const CHANNEL_CONNECTED_QUEUE_METADATA = 'connected-library:queue-metadata';
export const CHANNEL_CONNECTED_PREPARE_NEW = 'connected-library:prepare-new';
export const CHANNEL_CONNECTED_PREPARE_FILE = 'connected-library:prepare-file';
export const CHANNEL_CONNECTED_QUEUE_LIFECYCLE = 'connected-library:queue-lifecycle';
export const CHANNEL_CONNECTED_SYNC = 'connected-library:sync';
export const CHANNEL_CONNECTED_OPERATIONS = 'connected-library:operations';
export const CHANNEL_CONNECTED_CONFLICTS = 'connected-library:conflicts';
export const CHANNEL_CONNECTED_RESOLVE_CONFLICT = 'connected-library:resolve-conflict';
export const CHANNEL_CONNECTED_CLEANUP_CANDIDATES = 'connected-library:cleanup-candidates';
export const CHANNEL_CONNECTED_CONFIRM_CLEANUP = 'connected-library:confirm-cleanup';
export const CHANNEL_CONNECTED_MEDIA_PREVIEW = 'connected-library:media-preview';
export const CHANNEL_CONNECTED_DISCONNECT = 'connected-library:disconnect';
export interface LegacyReadOnlyProjection {
    state: 'unconfigured' | 'review-required' | 'ready' | 'unavailable' | 'closed';
    evidenceLevel: 'not-opened' | 'synthetic-read-only' | 'local-read-only';
    identity: string | null;
    generation: string | null;
    counts: {
        assets: number;
        tags: number;
        relations: number;
    };
    limitations: readonly string[];
}
export interface LegacyReadOnlyAssetProjection {
    id: string;
    title: string;
    fileName: string;
    tags: readonly string[];
    previewRef: string | null;
    referencedFileAvailable: boolean;
}
export interface LegacyReadOnlyReview {
    receipt: string;
    counts: {
        assets: number;
        tags: number;
        relations: number;
    };
    databaseIntegrity: 'ok';
    access: 'read-only';
    mutationPolicy: 'no-migration-no-copy-no-write';
    confirmable: true;
}
export interface LegacyReadOnlyWorkspace {
    inspect(): LegacyReadOnlyProjection;
    prepare(): Promise<{
        kind: 'cancelled';
    } | {
        kind: 'planned';
        review: LegacyReadOnlyReview;
    }>;
    confirm(receipt: string): Promise<LegacyReadOnlyProjection>;
    list(): Promise<readonly LegacyReadOnlyAssetProjection[]>;
    search(query: string): Promise<readonly LegacyReadOnlyAssetProjection[]>;
    readPreview(assetId: string): Promise<Uint8Array>;
    close(): Promise<void>;
}
export const CHANNEL_LEGACY_INSPECT = 'legacy-readonly:inspect';
export const CHANNEL_LEGACY_PREPARE = 'legacy-readonly:prepare';
export const CHANNEL_LEGACY_CONFIRM = 'legacy-readonly:confirm';
export const CHANNEL_LEGACY_LIST = 'legacy-readonly:list';
export const CHANNEL_LEGACY_SEARCH = 'legacy-readonly:search';
export const CHANNEL_LEGACY_MEDIA_PREVIEW = 'legacy-readonly:media-preview';
export const CHANNEL_LEGACY_CLOSE = 'legacy-readonly:close';
