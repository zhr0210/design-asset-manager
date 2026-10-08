import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const css = await fs.readFile('src/renderer/styles/design-system.css', 'utf8')
const pairs = [
  ['text', 'canvas'], ['text', 'surface'], ['muted', 'surface'],
  ['muted', 'canvas'], ['accent-text', 'accent'], ['accent', 'accent-soft'],
  ['muted', 'rail'], ['muted', 'surface-muted'],
  ['accent-text', 'primary-top'], ['accent-text', 'primary-bottom'],
  ['positive', 'positive-soft'], ['warning', 'warning-soft'], ['danger', 'danger-soft']
]

function luminance(hex) {
  const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

for (const [theme, selector] of [['light', ':root'], ['dark', '.dark']]) {
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0)
  const block = css.slice(start, css.indexOf('}', start))
  const tokens = Object.fromEntries([...block.matchAll(/--ui-([a-z-]+):\s*(#[a-f0-9]{6})/g)]
    .map(match => [match[1], match[2]]))
  let minimum = Infinity
  for (const [foreground, background] of pairs) {
    assert.ok(tokens[foreground] && tokens[background], `${theme}: missing semantic pair`)
    const a = luminance(tokens[foreground]), b = luminance(tokens[background])
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    assert.ok(contrast >= 4.5, `${theme} ${foreground}/${background}: ${contrast.toFixed(2)} must meet normal text AA contrast`)
    minimum = Math.min(minimum, contrast)
  }
  console.log(`${theme}: semantic text contrast passed (minimum ${minimum.toFixed(2)}:1)`)
}
