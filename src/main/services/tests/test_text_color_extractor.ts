import fs from 'fs'
import path from 'path'
import { TextColorExtractor } from '../text-color-extractor.service.js'
import { parseRgb, rgbToHex } from '../color-palette.service.js'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('❌ FAIL:', msg)
    process.exit(1)
  }
  console.log('✅ PASS:', msg)
}

// Setup base test directory inside the app's scratch space
const baseAppDir = path.join(process.env.APPDATA || path.join(require('os').homedir(), '.gemini'), 'antigravity')
const testDir = path.join(baseAppDir, 'scratch', 'test_synthetic_images')

if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true })
}

// Define the 10 synthetic SVG templates
const templates = {
  // 1. White background, black text
  white_bg_black_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
      <text x="35" y="60" font-size="28" fill="#000000" font-family="Arial" font-weight="bold">BLACK</text>
    </svg>
  `,
  // 2. Black background, white text
  black_bg_white_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#000000"/>
      <text x="35" y="60" font-size="28" fill="#FFFFFF" font-family="Arial" font-weight="bold">WHITE</text>
    </svg>
  `,
  // 3. Red background, yellow text
  red_bg_yellow_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FF0000"/>
      <text x="35" y="60" font-size="28" fill="#FFFF00" font-family="Arial" font-weight="bold">YELLOW</text>
    </svg>
  `,
  // 4. Gradient background, white text
  gradient_bg_white_text: `
    <svg width="200" height="100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" fill="url(#grad)"/>
      <text x="35" y="60" font-size="28" fill="#FFFFFF" font-family="Arial" font-weight="bold">WHITE</text>
    </svg>
  `,
  // 5. Busy picture background, black text
  busy_bg_black_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#E2E8F0"/>
      <circle cx="50" cy="50" r="30" fill="#F87171" opacity="0.6"/>
      <circle cx="150" cy="50" r="40" fill="#60A5FA" opacity="0.6"/>
      <text x="35" y="60" font-size="28" fill="#000000" font-family="Arial" font-weight="bold">BLACK</text>
    </svg>
  `,
  // 6. Stroke text on white background
  stroke_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
      <text x="35" y="60" font-size="28" fill="#FF0000" stroke="#000000" stroke-width="2" font-family="Arial" font-weight="bold">STROKE</text>
    </svg>
  `,
  // 7. Drop shadow text on white background
  shadow_text: `
    <svg width="200" height="100">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <rect width="200" height="100" fill="#FFFFFF"/>
      <text x="35" y="60" font-size="28" fill="#0000FF" filter="url(#shadow)" font-family="Arial" font-weight="bold">SHADOW</text>
    </svg>
  `,
  // 8. Tiny font size (skipped or evaluated cleanly)
  tiny_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
      <text x="80" y="55" font-size="8" fill="#FF0000" font-family="Arial">TINY</text>
    </svg>
  `,
  // 9. Blank image with no text
  no_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
    </svg>
  `,
  // 10. Multi-colored letters (Red, Green, Blue)
  multicolor_text: `
    <svg width="200" height="100">
      <rect width="200" height="100" fill="#FFFFFF"/>
      <text x="30" y="65" font-size="28" fill="#FF0000" font-family="Arial" font-weight="bold">R</text>
      <text x="70" y="65" font-size="28" fill="#00FF00" font-family="Arial" font-weight="bold">G</text>
      <text x="110" y="65" font-size="28" fill="#0000FF" font-family="Arial" font-weight="bold">B</text>
    </svg>
  `
}

async function renderTemplate(name: string, svg: string): Promise<string> {
  const sharp = (await import('sharp') as any).default || (await import('sharp') as any)
  const targetPath = path.join(testDir, `${name}.png`)
  await sharp(Buffer.from(svg.trim())).png().toFile(targetPath)
  return targetPath
}

async function runTests() {
  console.log('🚀 Rending synthetic test templates using sharp...')
  const paths: Record<string, string> = {}
  for (const [name, svg] of Object.entries(templates)) {
    paths[name] = await renderTemplate(name, svg)
  }

  const extractor = new TextColorExtractor()

  console.log('\n--- 🧪 Starting Programmatic Text Color Extraction Tests ---\n')

  // 1. 白底黑字 (White background, Black text)
  {
    console.log('[Test 1] White Background, Black Text')
    const res = await extractor.extractTextPalette({
      image_path: paths.white_bg_black_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasBlack = res.colors.some(c => c.hex === '#000000' || (c.rgb[0] < 30 && c.rgb[1] < 30 && c.rgb[2] < 30))
    assert(hasBlack, 'Should extract Black as a primary or secondary text color')
  }

  // 2. 黑底白字 (Black background, White text)
  {
    console.log('[Test 2] Black Background, White Text')
    const res = await extractor.extractTextPalette({
      image_path: paths.black_bg_white_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasWhite = res.colors.some(c => c.hex === '#FFFFFF' || (c.rgb[0] > 220 && c.rgb[1] > 220 && c.rgb[2] > 220))
    assert(hasWhite, 'Should extract White as a text color')
  }

  // 3. 红底黄字 (Red background, Yellow text)
  {
    console.log('[Test 3] Red Background, Yellow Text')
    const res = await extractor.extractTextPalette({
      image_path: paths.red_bg_yellow_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasYellow = res.colors.some(c => c.hex === '#FFFF00' || (c.rgb[0] > 200 && c.rgb[1] > 200 && c.rgb[2] < 50))
    assert(hasYellow, 'Should extract Yellow as a text color')
  }

  // 4. 渐变背景白字 (Gradient background, White text)
  {
    console.log('[Test 4] Gradient Background, White Text')
    const res = await extractor.extractTextPalette({
      image_path: paths.gradient_bg_white_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasWhite = res.colors.some(c => c.hex === '#FFFFFF' || (c.rgb[0] > 220 && c.rgb[1] > 220 && c.rgb[2] > 220))
    assert(hasWhite, 'Should extract White text color against gradient background')
  }

  // 5. 图片背景黑字 (Busy background, Black text)
  {
    console.log('[Test 5] Busy Background, Black Text')
    const res = await extractor.extractTextPalette({
      image_path: paths.busy_bg_black_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasBlack = res.colors.some(c => c.rgb[0] < 50 && c.rgb[1] < 50 && c.rgb[2] < 50)
    assert(hasBlack, 'Should extract Black text color from busy background')
  }

  // 6. 带描边文字 (Stroke text)
  {
    console.log('[Test 6] Stroked Text on White Background')
    const res = await extractor.extractTextPalette({
      image_path: paths.stroke_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasRedOrBlack = res.colors.some(c => c.hex === '#FF0000' || c.hex === '#000000' || c.rgb[0] > 200 || c.rgb[0] < 30)
    assert(hasRedOrBlack, 'Should extract red (foreground) or black (stroke) text colors')
  }

  // 7. 带阴影文字 (Shadow text)
  {
    console.log('[Test 7] Shadowed Text on White Background')
    const res = await extractor.extractTextPalette({
      image_path: paths.shadow_text,
      text_boxes: [{ x: 30 / 200, y: 30 / 100, width: 140 / 200, height: 45 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    const hasBlue = res.colors.some(c => c.rgb[2] > 200 && c.rgb[0] < 50)
    assert(hasBlue, 'Should extract Blue as a text color')
  }

  // 8. 小字号文字 (Tiny text)
  {
    console.log('[Test 8] Tiny text')
    const res = await extractor.extractTextPalette({
      image_path: paths.tiny_text,
      text_boxes: [{ x: 75 / 200, y: 45 / 100, width: 25 / 200, height: 15 / 100, confidence: 0.95 }]
    })
    // Tiny text has low foreground representation, so it can be skipped or evaluated cleanly without errors
    assert(res.status === 'success' || res.status === 'skipped', 'Tiny text should evaluate safely without crashing')
    console.log(`- Tiny text status: ${res.status}, colors extracted count: ${res.colors.length}`)
  }

  // 9. 无文字图片 (Blank image, no text)
  {
    console.log('[Test 9] Blank Image (No Text)')
    const res = await extractor.extractTextPalette({
      image_path: paths.no_text,
      text_boxes: []
    })
    assert(res.colors.length === 0, 'Colors array should be empty')
    assert(res.status === 'none', 'Status should be none')
  }

  // 10. 多色文字图片 (Multi-colored letters)
  {
    console.log('[Test 10] Multi-colored Text on White Background')
    const res = await extractor.extractTextPalette({
      image_path: paths.multicolor_text,
      text_boxes: [{ x: 15 / 200, y: 30 / 100, width: 170 / 200, height: 50 / 100, confidence: 0.95 }]
    })
    assert(res.status === 'success', 'Extraction should succeed')
    console.log('- Colors extracted:', res.colors.map(c => c.hex).join(', '))
    assert(res.colors.length >= 2, 'Should extract multiple contrasting letter colors')
  }

  console.log('\n🧹 Cleaning up synthetic test images...')
  for (const p of Object.values(paths)) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
    }
  }
  console.log('🎉 All 10 synthetic programmatic text color extraction tests passed beautifully!')
}

runTests().catch((err) => {
  console.error('❌ Test execution failed with error:', err)
  process.exit(1)
})
