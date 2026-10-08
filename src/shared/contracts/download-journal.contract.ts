/** Main-only persistence port. Never exposed through Preload or App history. */
export interface DownloadIntent {
  task_id: string; library_identity: string; creation_generation: string; request_url: string; file_name: string
  phase: 'pending' | 'receiving' | 'downloaded' | 'importing' | 'completed' | 'cancelled' | 'failed' | 'recovery-required'
  revision: number; transfer_epoch: number; strong_etag: string | null; identity_encoding: number
  total_bytes: number | null; committed_bytes: number; content_sha256: string | null; asset_id: string | null
  error_code: string | null; created_at: string; updated_at: string
}
export type DownloadJournalCommand = { generation: string } & DownloadJournalOperation
export type DownloadJournalOperation = (
  | { kind: 'list' }
  | { kind: 'create'; taskId: string; url: string; fileName: string }
  | { kind: 'retention'; taskId: string }
  | { kind: 'abandon'; taskId: string; revision: number }
  | { kind: 'read'; taskId: string; revision?: number }
  | { kind: 'reset'; taskId: string; revision: number; etag: string | null; total: number | null }
  | { kind: 'append'; taskId: string; revision: number; epoch: number; offset: number; bytes: Uint8Array }
  | { kind: 'downloaded'; taskId: string; revision: number }
  | { kind: 'import'; taskId: string; revision: number }
  | { kind: 'cleanup'; taskId: string; revision: number }
)
export interface DownloadJournalResult { version: number; intents?: DownloadIntent[]; intent?: DownloadIntent; bytes?: Uint8Array; assetId?: string; retainedBytes?: number; releasedBytes?: number; captureAccepted?: boolean }
