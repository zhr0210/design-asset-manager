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
