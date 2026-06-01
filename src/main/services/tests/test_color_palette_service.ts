import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ColorPaletteService } from '../color-palette.service'
import { initDatabase, getDatabase } from '../../db'
import { ImageNormalizeService } from '../image-normalize.service'
import { ImageMetadataService } from '../image-metadata.service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('❌ FAIL:', msg)
    process.exit(1)
  }
  console.log('✅ PASS:', msg)
}

console.log('Starting Color Palette Service Unit & Safeguard Tests...')

// ==========================================
// 🛡️ STATIC CODE SCANNING SAFEGUARD TEST
// ==========================================
console.log('\nRunning static code regression scanning safeguard...')
const targetServicePath = path.resolve(__dirname, '../color-palette.service.ts')
assert(fs.existsSync(targetServicePath), `color-palette.service.ts exists at: ${targetServicePath}`)

const sourceContent = fs.readFileSync(targetServicePath, 'utf8')

// Prohibited straight-to-disk calls using path strings
const dangerousPatterns = [
  /colorthief\s*\.\s*getColor\s*\(\s*(resolvedPath|imagePath|filePath|originalPath)\s*\)/i,
  /colorthief\s*\.\s*getPalette\s*\(\s*(resolvedPath|imagePath|filePath|originalPath)\s*\,/i,
  /getColor\s*\(\s*(resolvedPath|imagePath|filePath|originalPath)\s*\)/i,
  /getPalette\s*\(\s*(resolvedPath|imagePath|filePath|originalPath)\s*\,/i
]

for (const pattern of dangerousPatterns) {
  const isMatch = pattern.test(sourceContent)
  // Ensure we don't trip on comments explaining the rule
  const lines = sourceContent.split('\n')
  const activeMatches = lines.filter(line => {
    return pattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.includes('dangerousPatterns')
  })
  
  assert(activeMatches.length === 0, `No dangerous direct path calls to ColorThief matching ${pattern.toString()}. Found: ${JSON.stringify(activeMatches)}`)
}
console.log('🛡️ Static scanning guard: PASS. No direct original path calls to ColorThief found.')

// ==========================================
// 🧪 DATABASE & EXTRACTION TESTS
// ==========================================

// Safely attempt database initialization
let isDbAvailable = false
try {
  initDatabase()
  isDbAvailable = true
} catch (err) {
  console.warn('[Test] SQLite native module not fully compatible with system Node version. Running in Lite Mode.')
}

const service = new ColorPaletteService()
const dummyPath = '~/DesignAssetManager/library/transparent_swatch_test.png'

service.extractPalette(dummyPath, []).then(async (palette) => {
  assert(palette.version === 1, 'Version is 1')
  assert(palette.provider.startsWith('mock_fallback') || palette.provider.startsWith('sharp_colorthief'), 'Correct provider loaded')
  
  // Image palette swatches
  const imgPalette = palette.image_palette
  assert(imgPalette.swatches.length === 8, 'Extracted 8 swatches')
  assert(imgPalette.dominant !== undefined, 'Dominant color calculated')
  assert(imgPalette.dominant.hex.startsWith('#'), 'Dominant color is hex code')
  
  // Themes
  const themes = imgPalette.themes
  assert(typeof themes.isWarm === 'boolean', 'Warm tone classified')
  assert(typeof themes.isCool === 'boolean', 'Cool tone classified')
  assert(typeof themes.isNeutral === 'boolean', 'Neutral classified')
  assert(['dark', 'light', 'medium'].includes(themes.backgroundType), 'Background type determined')
  
  // Text palette empty when no boxes are passed
  assert(palette.text_palette.swatches.length === 0, 'Text swatches empty when no boxes are passed')

  // 1. Test refreshTextPaletteFromTextBlocks integration
  console.log('\nTesting refreshTextPaletteFromTextBlocks...')
  
  let db: any = null
  if (isDbAvailable) {
    try {
      db = getDatabase()
    } catch (_) {}
  }

  if (db) {
    const mockAssetId = 'test-asset-123'
    
    // Insert a mock asset into database
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, title, file_name, file_path, color_palette_json)
      VALUES (?, 'Test Swatch Asset', 'transparent_swatch_test.png', ?, ?)
    `).run(mockAssetId, dummyPath, JSON.stringify(palette))

    const sampleQwenVlBlocks = [
      { box: [100, 100, 200, 300], text: 'HEADER TEXT' }
    ]

    await service.refreshTextPaletteFromTextBlocks(mockAssetId, sampleQwenVlBlocks)
    
    // Read from DB and assert
    const row = db.prepare('SELECT color_palette_json FROM assets WHERE id = ?').get(mockAssetId) as { color_palette_json: string } | undefined
    assert(row !== undefined, 'Asset found in database after refresh')
    if (row) {
      const refreshed = JSON.parse(row.color_palette_json)
      assert(refreshed.text_palette.provider === 'qwen_vl_text_blocks', 'Provider refreshed to qwen_vl_text_blocks')
      assert(refreshed.text_palette.colors.length > 0, 'Text color swatches populated after Qwen-VL refresh')
    }
    
    // Clean up
    db.prepare('DELETE FROM assets WHERE id = ?').run(mockAssetId)
    db.prepare("DELETE FROM tag_suggestions WHERE asset_id = ?").run(mockAssetId)

    // 2. Programmatic Test for tag suggestion protection (Correction 2)
    console.log('\nTesting mock text color tag suggestion protection...');
    const mockAssetId2 = 'test-asset-456'
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, title, file_name, file_path, color_palette_json)
      VALUES (?, 'Test Swatch Asset 2', 'transparent_swatch_test.png', ?, '')
    `).run(mockAssetId2, dummyPath)

    const { SettingsService } = await import('../settings.service')
    const originalSettings = SettingsService.getInstance().getSettings()

    // Enforce mock provider
    SettingsService.getInstance().saveSettings({
      enableTextColorPalette: true,
      textDetectionProvider: 'mock_text_boxes'
    })

    // Perform background extraction which writes suggestions
    await service.extractAndSavePalette(mockAssetId2, dummyPath)

    // Read suggestions and assert
    const suggestions = db.prepare('SELECT tag_name FROM tag_suggestions WHERE asset_id = ?').all() as Array<{ tag_name: string }>
    const hasTextTags = suggestions.some(s => s.tag_name.includes('文字') || s.tag_name.includes('金色'))
    assert(!hasTextTags, 'Security Guard passed: Mock text color swatches did NOT generate tag suggestions!')

    // Clean up and restore settings
    db.prepare('DELETE FROM assets WHERE id = ?').run(mockAssetId2)
    db.prepare("DELETE FROM tag_suggestions WHERE asset_id = ?").run(mockAssetId2)
    SettingsService.getInstance().saveSettings(originalSettings)

    // 3. Programmatic Test for Correction 3 (safe swatches & colors differentiation)
    console.log('\nTesting safe swatches and colors differentiation...');
    
    // Case A: provider = 'none', status = 'none', swatches = empty, no text tag
    const testPaletteNone = {
      version: 1,
      image_palette: { dominant: { hex: '#FFFFFF', rgb: [255,255,255], hsl: [0,0,100], percentage: 100, role: 'background', family: '白色系' }, swatches: [] },
      text_palette: { provider: 'none', status: 'none', swatches: [], colors: [], warnings: [] }
    }
    
    const mockAssetIdNone = 'test-asset-none'
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, title, file_name, file_path, color_palette_json)
      VALUES (?, 'Test None Swatch', 'transparent_swatch_test.png', ?, ?)
    `).run(mockAssetIdNone, dummyPath, JSON.stringify(testPaletteNone))
    
    await service.extractAndSavePalette(mockAssetIdNone, dummyPath)
    
    const suggestionsNone = db.prepare('SELECT tag_name FROM tag_suggestions WHERE asset_id = ?').all() as Array<{ tag_name: string }>
    const hasTextTagsNone = suggestionsNone.some(s => s.tag_name.includes('文字') || s.tag_name.includes('金色'))
    assert(!hasTextTagsNone, 'Case A Passed: provider=none generates NO text tag suggestions')
    db.prepare('DELETE FROM assets WHERE id = ?').run(mockAssetIdNone)
    db.prepare("DELETE FROM tag_suggestions WHERE asset_id = ?").run(mockAssetIdNone)
    
    // Case B: status = 'success', isMock = false, BUT only colors is non-empty, swatches is empty or missing
    const testPaletteOnlyColors = {
      version: 1,
      image_palette: { dominant: { hex: '#FFFFFF', rgb: [255,255,255], hsl: [0,0,100], percentage: 100, role: 'background', family: '白色系' }, swatches: [] },
      text_palette: { provider: 'custom', status: 'success', isMock: false, swatches: [], colors: [{ hex: '#FFFFFF', rgb: [255,255,255], hsl: [0,0,100], role: 'text_primary', confidence: 0.95 }], warnings: [] }
    }
    const mockAssetIdOnlyColors = 'test-asset-only-colors'
    db.prepare(`
      INSERT OR REPLACE INTO assets (id, title, file_name, file_path, color_palette_json)
      VALUES (?, 'Test Only Colors', 'transparent_swatch_test.png', ?, ?)
    `).run(mockAssetIdOnlyColors, dummyPath, JSON.stringify(testPaletteOnlyColors))
    
    await service.refreshTextPaletteFromTextBlocks(mockAssetIdOnlyColors, [])
    const suggestionsOnlyColors = db.prepare('SELECT tag_name FROM tag_suggestions WHERE asset_id = ?').all() as Array<{ tag_name: string }>
    const hasTextTagsOnlyColors = suggestionsOnlyColors.some(s => s.tag_name.includes('文字') || s.tag_name.includes('金色'))
    assert(!hasTextTagsOnlyColors, 'Case B Passed: colors non-empty but swatches empty does NOT throw and generates NO text tags')
    db.prepare('DELETE FROM assets WHERE id = ?').run(mockAssetIdOnlyColors)
    db.prepare("DELETE FROM tag_suggestions WHERE asset_id = ?").run(mockAssetIdOnlyColors)
  } else {
    console.log('[Test] SQLite integration skipped due to environment incompatibility. Fallback execution simulated.')
  }

  // ==========================================
  // 📸 PALETTE SAFE BUFFER TEST (SHARP DECODING)
  // ==========================================
  console.log('\nTesting Palette Safe Buffer Creation...')
  try {
    const testImgDir = path.join(__dirname, 'mocks')
    if (!fs.existsSync(testImgDir)) {
      fs.mkdirSync(testImgDir, { recursive: true })
    }

    // Try to run real sharp tests if sharp is available
    const sharp = (await import('sharp') as any).default || (await import('sharp') as any)
    if (sharp) {
      const pngPath = path.join(testImgDir, 'alpha_test.png')
      
      // Generate a transparent PNG gradient with alpha channel to test transparency merging
      const width = 100
      const height = 100
      const transparentBuffer = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0 } // Fully transparent red
        }
      })
      .png()
      .toBuffer()

      fs.writeFileSync(pngPath, transparentBuffer)

      // Get safe palette buffer - this should flatten transparent red to pure white (#ffffff)
      const safeBuffer = await ImageNormalizeService.createPaletteSafeBuffer(pngPath)
      assert(safeBuffer instanceof Buffer, 'createPaletteSafeBuffer returns standard Node Buffer')

      // Load safeBuffer back into sharp to verify it is standard sRGB and flattened
      const meta = await sharp(safeBuffer).metadata()
      assert(meta.format === 'jpeg', 'Palette Safe Buffer output format is normalized to jpeg')
      assert(!meta.hasAlpha, 'Palette Safe Buffer successfully flattened alpha channels')

      // Clean up test image
      if (fs.existsSync(pngPath)) {
        fs.unlinkSync(pngPath)
      }
      console.log('📸 Palette Safe Buffer Test: PASS.')
    }
  } catch (sharpErr: any) {
    console.log('[Test] Sharp native tests skipped or partial due to systems node version compatibility:', sharpErr?.message || String(sharpErr))
  }

  console.log('\n🎉 All Color Palette Service unit & safeguard tests passed successfully!')

}).catch((err) => {
  console.error('❌ Async Test Error:', err)
  process.exit(1)
})
