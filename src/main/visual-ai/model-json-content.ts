/** Accept plain JSON or one complete Markdown JSON fence. No prose extraction,
 * partial objects, additional blocks or executable content is interpreted. */
export function parseModelJsonContent(content: string): unknown {
  const trimmed = content.trim()
  const fence = /^```(?:json)?[ \t]*\r?\n([\s\S]*)\r?\n```$/i.exec(trimmed)
  return JSON.parse(fence ? fence[1] : trimmed)
}
