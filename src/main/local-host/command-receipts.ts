interface Grant { owner: string; generation: string; purpose: string; expires: number }
const rawReceiptCommands = new Set([
  'library:create:confirm','library:add:dispatch','image-tools:save','image-tools:discard',
  'download:enqueue','download:discard','ai-connection:confirm-validation','ai-connection:discard-validation',
  'background-ocr:confirm','background-ocr:discard','asset-ocr:run','tag-decision:confirm','tag-decision:discard',
  'background-analysis:confirm','background-analysis:confirm-execution','background-analysis:discard','basic-analysis:run','basic-analysis:discard','tag-batch:run','tag-batch:discard',
  'tag-execution:run','tag-execution:discard-review','independent-tags:confirm','visual-ai:run','visual-ai:discard-review'
])
const purposeOf = (command: string) => command.startsWith('library:') ? command.split(':').slice(0,2).join(':') : command.split(':')[0]
/** Per-client receipt association supplements the domain's own one-use and validity checks. */
export function createCommandReceiptAuthority(input: { generation(): string; now?(): number; maxEntries?: number; ttlMs?: number }) {
  const grants = new Map<string, Grant>()
  const now = input.now ?? Date.now
  const keyOf = (owner: string, receipt: string) => JSON.stringify([owner,receipt])
  const strings = (value: unknown, found: string[] = [], depth = 0): string[] => {
    if (depth > 12 || !value || typeof value !== 'object') return found
    if (Array.isArray(value)) { for (const entry of value) strings(entry, found, depth + 1); return found }
    for (const [key, item] of Object.entries(value)) {
      if (['receipt', 'planReceipt', 'review'].includes(key) && typeof item === 'string') found.push(item)
      else if (item && typeof item === 'object') strings(item, found, depth + 1)
    }
    return found
  }
  const prune = () => { for (const [key, grant] of grants) if (grant.expires <= now() || grant.generation !== input.generation()) grants.delete(key) }
  return {
    release(owner: string) { for (const [key, grant] of grants) if (grant.owner === owner) grants.delete(key) },
    async execute<T>(owner: string, args: unknown[], operation: () => Promise<T>, command: string): Promise<T> {
      prune()
      const generation = input.generation(), purpose = purposeOf(command)
      const supplied = strings(args)
      for (const arg of args) if (typeof arg === 'string' && rawReceiptCommands.has(command)) supplied.push(arg)
      for (const receipt of supplied) {
        const grant = grants.get(keyOf(owner,receipt))
        if (!grant || grant.generation !== generation || grant.purpose !== purpose || grant.expires <= now()) throw Error('RECEIPT_SCOPE_EXPIRED')
      }
      const result = await operation()
      for (const receipt of strings(result)) grants.set(keyOf(owner,receipt), { owner, generation, purpose, expires: now() + (input.ttlMs ?? 30 * 60_000) })
      while (grants.size > (input.maxEntries ?? 10_000)) grants.delete(grants.keys().next().value!)
      return result
    }
  }
}
