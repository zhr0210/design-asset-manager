export interface IntakeRecoveryItem {
  id: string; kind: 'copy' | 'variant'; fileName: string; bytes: number
  state: 'intake' | 'active' | 'variant-pending'
}
export interface IntakeRecoveryState { version: number; items: IntakeRecoveryItem[] }
export interface IntakeRecoveryReview extends IntakeRecoveryItem {
  receipt: string; libraryIdentity: string; generation: string
}
export interface IntakeRecoveryApi {
  list(): Promise<{ success: boolean; value?: IntakeRecoveryState; error?: string }>
  prepare(input: { id: string; selectSource?: boolean }): Promise<{ success: boolean; value?: IntakeRecoveryReview | { kind: 'cancelled' }; error?: string }>
  run(receipt: string): Promise<{ success: boolean; value?: { assetId: string }; error?: string }>
}
