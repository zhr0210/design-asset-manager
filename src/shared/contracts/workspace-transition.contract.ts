export interface TransitionReview {
  id: string
  action: 'switch-library' | 'quit'
  drafts: number
  nativeDrafts: number
  accounts: number
  changed: boolean
}
export interface TransitionFlushRequest { id: string }
