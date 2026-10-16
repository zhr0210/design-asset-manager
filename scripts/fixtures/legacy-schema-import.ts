import path from 'node:path'
import type { Plugin } from 'esbuild'
export const legacySchemaImport: Plugin = { name: 'legacy-schema-import', setup(build) {
  build.onResolve({ filter: /managed-download\/download-journal\.schema$/ }, () => ({ path: path.resolve('src/main/library-lifecycle/legacy-download.schema.ts') }))
} }
