import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'

export async function digestFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer)
  }
  return hash.digest('hex')
}
