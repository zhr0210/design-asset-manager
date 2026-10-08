import type { WorkMediaScope, WorkMediaSnapshot, WorkMediaWrite, WorkHandoffRequest, WorkHandoffReceipt } from '../../../../shared/contracts/work-media.contract';
import type { WorkResult } from '../../../../shared/contracts/work-set.contract';
import { requireWorkspaceClient, workspaceMediaUrl } from '../../../workspace-client';
export interface WorkMediaActions {
    read(input: WorkMediaScope): Promise<WorkResult<WorkMediaSnapshot>>;
    write(input: WorkMediaWrite): Promise<WorkResult<WorkMediaSnapshot>>;
    cancel(): Promise<WorkResult<{
        message: string;
    }>>;
    handoff(input: WorkHandoffRequest): Promise<WorkResult<WorkHandoffReceipt>>;
    list?: (scope: WorkMediaScope) => Promise<WorkResult<WorkHandoffReceipt[]>>;
    clear?: (id: string) => Promise<WorkResult<{
        message: string;
    }>>;
    drag?: (id: string) => Promise<WorkResult<{
        message: string;
    }>>;
}
export const workspaceWorkMediaActions: WorkMediaActions = {
    list: scope => requireWorkspaceClient().workSets.listHandoffs(scope),
    read: scope => requireWorkspaceClient().workSets.mediaRead(scope),
    write: input => requireWorkspaceClient().workSets.mediaWrite(input), cancel: () => requireWorkspaceClient().workSets.mediaCancel(),
    handoff: input => requireWorkspaceClient().workSets.fileHandoff(input), clear: id => requireWorkspaceClient().workSets.clearHandoff(id)
};
export function workMediaUrl(scope: WorkMediaScope, frameId?: string): string {
    const parts = [scope.libraryIdentity, scope.generation, scope.setId, scope.assetId, ...(frameId ? [frameId] : [])].map(encodeURIComponent).join('/');
    return workspaceMediaUrl('dam-workmedia://media/' + parts);
}
export const mediaDraftId = (scope: WorkMediaScope) => scope.setId + '~' + scope.assetId;
