export interface FilePickerEntry { id: string; name: string; kind: 'directory' | 'file' }
/** Shared bounded listing and confirmation capacity; never an arbitrary path grant. */
export const FILE_PICKER_MAX_ENTRIES = 2000
export interface FilePickerSnapshot {
  id: string
  title: string
  mode: 'directory' | 'files'
  multiple: boolean
  directory: string
  directoryId: string
  parentId: string | null
  roots: FilePickerEntry[]
  entries: FilePickerEntry[]
  truncated: boolean
}
export const FILE_PICKER_REQUESTED = 'files:requested'
