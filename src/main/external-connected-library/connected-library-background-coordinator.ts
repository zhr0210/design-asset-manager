import type { ConnectedLibraryProjection, ExternalConnectedLibrary } from '../../shared/contracts/external-connected-library.contract';
/** Window-independent scheduler. It never connects or writes before a reviewed grant exists. */
export class ConnectedLibraryBackgroundCoordinator {
    private timer: NodeJS.Timeout | null = null;
    private activeTick: Promise<void> | null = null;
    constructor(private readonly input: {
        host: ExternalConnectedLibrary;
        intervalMs?: number;
        onProjection?(projection: ConnectedLibraryProjection): void;
    }) { }
    start(): void { if (this.timer)
        return; this.timer = setInterval(() => void this.tick(), Math.max(5000, this.input.intervalMs ?? 30000)); this.timer.unref?.(); this.input.onProjection?.(this.input.host.inspect()); }
    async tick(): Promise<void> { if (this.activeTick)
        return this.activeTick; this.activeTick = this.runTick().finally(() => { this.activeTick = null; }); return this.activeTick; }
    async drain(): Promise<void> { if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    } await this.activeTick; }
    private async runTick(): Promise<void> { const before = this.input.host.inspect(); if (before.grant === 'none' || before.state === 'closed' || before.state === 'review-required')
        return; try {
        await this.input.host.indexNextPage(250);
        if (before.grant === 'read-write')
            await this.input.host.synchronize(100);
    }
    catch { /* disconnected/conflict remains observable through projection */ }
    finally {
        this.input.onProjection?.(this.input.host.inspect());
    } }
}
