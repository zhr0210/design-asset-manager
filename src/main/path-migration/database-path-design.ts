import path from 'path'

export type PathRootId = 'library' | 'managed-cache' | 'managed-database' | 'legacy-absolute' | 'external'

export interface PathRootDefinition {
  id: PathRootId
  label: string
  rootPath?: string
  userManaged: boolean
  migratable: boolean
}

export interface LibraryRelativePath {
  pathRootId: PathRootId
  relativePath: string | null
  legacyAbsolutePath: string | null
  portablePath: string
  warnings: string[]
}

export interface DatabasePathRowSample {
  id: string
  table: 'assets' | 'ai_tag_tasks' | 'ai_prompt_tasks' | 'ai_analysis_tasks' | 'download_tasks'
  field: string
  value: string | null | undefined
}

export interface DatabasePathRemapDryRunItem {
  id: string
  table: DatabasePathRowSample['table']
  field: string
  currentValuePresent: boolean
  next: LibraryRelativePath
  action: 'map-to-library-relative' | 'keep-legacy-absolute' | 'skip-empty'
}

export interface DatabasePathRemapDryRunReport {
  phase: '13A'
  schemaChange: false
  dataMigration: false
  root: PathRootDefinition
  items: DatabasePathRemapDryRunItem[]
  summary: {
    total: number
    mapped: number
    legacyFallback: number
    skipped: number
  }
}

export function createLibraryPathRoot(rootPath: string): PathRootDefinition {
  return {
    id: 'library',
    label: 'Asset library root',
    rootPath,
    userManaged: true,
    migratable: true
  }
}

export function createLibraryRelativePath(value: string | null | undefined, libraryRoot: string): LibraryRelativePath {
  const warnings: string[] = []
  const trimmed = value?.trim()
  if (!trimmed) {
    return {
      pathRootId: 'legacy-absolute',
      relativePath: null,
      legacyAbsolutePath: null,
      portablePath: '',
      warnings: ['Path value is empty.']
    }
  }

  const resolvedRoot = path.resolve(libraryRoot)
  const resolvedValue = path.resolve(trimmed)
  const relative = path.relative(resolvedRoot, resolvedValue)
  const isInsideLibrary = Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative))

  if (!isInsideLibrary) {
    warnings.push('Path is outside the proposed library root; keep legacy absolute fallback.')
    return {
      pathRootId: 'legacy-absolute',
      relativePath: null,
      legacyAbsolutePath: trimmed,
      portablePath: trimmed,
      warnings
    }
  }

  return {
    pathRootId: 'library',
    relativePath: relative.split(path.sep).join('/'),
    legacyAbsolutePath: trimmed,
    portablePath: `library://${relative.split(path.sep).join('/')}`,
    warnings
  }
}

export function createDatabasePathRemapDryRun(rows: DatabasePathRowSample[], libraryRoot: string): DatabasePathRemapDryRunReport {
  const root = createLibraryPathRoot(libraryRoot)
  const items = rows.map((row): DatabasePathRemapDryRunItem => {
    const next = createLibraryRelativePath(row.value, libraryRoot)
    const action = !row.value?.trim()
      ? 'skip-empty'
      : next.pathRootId === 'library'
        ? 'map-to-library-relative'
        : 'keep-legacy-absolute'
    return {
      id: row.id,
      table: row.table,
      field: row.field,
      currentValuePresent: Boolean(row.value?.trim()),
      next,
      action
    }
  })

  return {
    phase: '13A',
    schemaChange: false,
    dataMigration: false,
    root,
    items,
    summary: {
      total: items.length,
      mapped: items.filter((item) => item.action === 'map-to-library-relative').length,
      legacyFallback: items.filter((item) => item.action === 'keep-legacy-absolute').length,
      skipped: items.filter((item) => item.action === 'skip-empty').length
    }
  }
}
