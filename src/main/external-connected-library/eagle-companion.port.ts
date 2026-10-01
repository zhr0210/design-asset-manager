export type EagleCompanionRequest = {
    kind: 'negotiate';
    sessionToken: string;
    libraryIdentity: string;
} | {
    kind: 'snapshot-item';
    sessionToken: string;
    libraryIdentity: string;
    itemId: string;
} | {
    kind: 'read-preview';
    sessionToken: string;
    libraryIdentity: string;
    itemId: string;
    maxBytes: number;
} | {
    kind: 'replace-file';
    sessionToken: string;
    libraryIdentity: string;
    itemId: string;
    stagedFilePath: string;
    expectedFingerprint: string;
    desiredFingerprint: string;
};
export type EagleCompanionResponse = {
    ok: true;
    kind: 'capabilities';
    fileReplace: true;
    libraryIdentity: string;
} | {
    ok: true;
    kind: 'item-snapshot';
    itemId: string;
    contentFingerprint: string;
    size: number;
} | {
    ok: true;
    kind: 'preview';
    itemId: string;
    mimeType: string;
    bytesBase64: string;
} | {
    ok: true;
    kind: 'replace-result';
    itemId: string;
    state: 'applied' | 'conflict' | 'uncertain';
    contentFingerprint: string | null;
} | {
    ok: false;
    code: 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'LIBRARY_CHANGED' | 'ITEM_UNAVAILABLE' | 'STAGING_PATH_REJECTED' | 'OPERATION_FAILED';
};
export interface EagleCompanionPort {
    invoke(request: EagleCompanionRequest): Promise<EagleCompanionResponse>;
}
