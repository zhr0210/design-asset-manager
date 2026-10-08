export interface FilePickerEntry { id: string; name: string; kind: 'directory' | 'file' }
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
