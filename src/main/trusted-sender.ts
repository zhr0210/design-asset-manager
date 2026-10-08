export function isTrustedLibrarySender(
  event: { sender: { id: number }; senderFrame?: { parent?: unknown; url?: string } | null },
  window: { isDestroyed(): boolean; webContents: { id: number; getURL(): string } } | null,
  trustedEntryUrl: string,
  trustedMainFrame?: object | null
): boolean {
  const frame = event.senderFrame
  return Boolean(window && !window.isDestroyed() && event.sender.id === window.webContents.id &&
    urlsMatchIgnoringFragment(window.webContents.getURL(), trustedEntryUrl) &&
    (frame !== undefined && frame !== null && frame.parent === null &&
      urlsMatchIgnoringFragment(frame.url ?? '', trustedEntryUrl) &&
      (!trustedMainFrame || frame === trustedMainFrame)))
}

function urlsMatchIgnoringFragment(actual: string, expected: string): boolean {
  try {
    const left = new URL(actual)
    const right = new URL(expected)
    return left.protocol === right.protocol && left.username === right.username &&
      left.password === right.password && left.host === right.host &&
      left.pathname === right.pathname && left.search === right.search
  } catch {
    return false
  }
}
