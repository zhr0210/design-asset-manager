/**
 * Snapshot one bounded ordinary data record without invoking accessors or
 * accepting inherited/symbol properties. Internal to Library Lifecycle.
 */
export function snapshotPlainDataRecord(
  value: unknown,
  maxFields: number
): Record<string, unknown> | undefined {
  try {
    if (!Number.isInteger(maxFields) || maxFields < 0 || maxFields > 64 ||
      value === null || typeof value !== 'object') return undefined
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== Object.prototype) return undefined
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.length > maxFields || keys.some((key) => typeof key !== 'string')) {
      return undefined
    }
    const result: Record<string, unknown> = Object.create(null)
    for (const key of keys as string[]) {
      const descriptor = descriptors[key]
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return undefined
      result[key] = descriptor.value
    }
    return result
  } catch {
    return undefined
  }
}

export function readExactPlainDataRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> | undefined {
  const record = snapshotPlainDataRecord(value, expectedKeys.length)
  return record && Object.keys(record).length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(record, key)) ? record : undefined
}
