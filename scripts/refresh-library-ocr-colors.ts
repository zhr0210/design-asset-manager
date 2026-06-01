import fs from 'fs'
import path from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { app } from 'electron'
import { initDatabase } from '../src/main/db/index'
import { ColorPaletteService } from '../src/main/services/color-palette.service'
import { SettingsService } from '../src/main/services/settings.service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Resolve a persistent progress log file
const baseDir = path.join(homedir(), 'DesignAssetManager')
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true })
}
const logFilePath = path.join(baseDir, 'refresh_progress.log')

// Clean the log file at startup
fs.writeFileSync(logFilePath, '', 'utf8')

function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`
  console.log(line)
  fs.appendFileSync(logFilePath, line + '\n', 'utf8')
}

function logError(message: string, error?: any) {
  const errStr = error ? ` | Error: ${error.stack || error.message || String(error)}` : ''
  const line = `[${new Date().toISOString()}] ❌ ${message}${errStr}`
  console.error(line)
  fs.appendFileSync(logFilePath, line + '\n', 'utf8')
}

async function main() {
  log('=============================================================')
  log('🌟 Legacy Design Asset OCR Color Palette Refresh Tool')
  log('=============================================================')

  const force = process.argv.includes('--force')
  if (force) {
    log('🔥 Mode: FORCE REFRESH (All scanned assets will be re-processed)')
  } else {
    log('⚡ Mode: DELTA REFRESH (Only processing legacy or skipped assets)')
  }

  // 1. Init database connection
  log('\n[SQLite] Initializing SQLite connection...')
  let db
  try {
    db = initDatabase()
    log('✅ SQLite connected successfully.')
  } catch (err) {
    logError('Failed to connect to database', err)
    app.exit(1)
  }

  // 2. Override settings for bulk execution
  const settingsService = SettingsService.getInstance()
  const originalSettings = { ...settingsService.getSettings() }

  log('[Settings] Dynamic override: Enforcing EasyOCR text color analysis for bulk run.')
  settingsService.saveSettings({
    enableTextColorAnalysis: true,
    textBoxProvider: 'easyocr',
    ocrTimeoutMs: 15000,
    maxTextBoxesPerImage: 30
  })

  // 3. Fetch assets
  log('[SQLite] Scanning assets in the database...')
  const assets = db.prepare('SELECT id, file_path, color_palette_json, file_name FROM assets').all() as Array<{
    id: string
    file_path: string
    color_palette_json?: string
    file_name?: string
  }>

  const totalScanned = assets.length
  log(`🔍 Scanned ${totalScanned} assets from the library.`)

  const eligibleAssets: typeof assets = []
  const skippedAssets: typeof assets = []

  for (const asset of assets) {
    let needsRefresh = false
    if (force || !asset.color_palette_json) {
      needsRefresh = true
    } else {
      try {
        const palette = JSON.parse(asset.color_palette_json)
        // Check if text swatches or color palette details are missing/skipped
        const textPalette = palette.text_palette
        if (!textPalette || 
            !textPalette.swatches || 
            textPalette.swatches.length === 0 || 
            textPalette.status !== 'success' ||
            textPalette.isMock === true) {
          needsRefresh = true
        }
      } catch (err) {
        needsRefresh = true
      }
    }

    if (needsRefresh) {
      eligibleAssets.push(asset)
    } else {
      skippedAssets.push(asset)
    }
  }

  const totalEligible = eligibleAssets.length
  log(`📊 Delta analysis complete:`)
  log(`   - Eligible for refresh: ${totalEligible}`)
  log(`   - Already up-to-date (Skipped): ${skippedAssets.length}`)

  if (totalEligible === 0) {
    log('\n🎉 No assets require a refresh. Your library is fully up to date!')
    log('Restoring settings...')
    settingsService.saveSettings(originalSettings)
    app.exit(0)
  }

  log(`\n🚀 Commencing EasyOCR + OpenCV batch processing on ${totalEligible} assets...`)
  log('=============================================================')

  let successCount = 0
  let failCount = 0
  const startTime = Date.now()
  const service = new ColorPaletteService()

  for (let i = 0; i < totalEligible; i++) {
    const asset = eligibleAssets[i]
    const index = i + 1
    const displayName = asset.file_name || path.basename(asset.file_path)
    const itemStart = Date.now()

    log(`[${index}/${totalEligible}] ⏳ Processing: ${displayName} (ID: ${asset.id})...`)

    try {
      // Execute the color palette extraction and save directly to SQLite
      await service.extractAndSavePalette(asset.id, asset.file_path)
      
      const elapsed = Date.now() - itemStart
      log(`[${index}/${totalEligible}] ✅ SUCCESS | ${displayName} | Time: ${elapsed}ms`)
      successCount++
    } catch (err) {
      const elapsed = Date.now() - itemStart
      logError(`[${index}/${totalEligible}] FAILED  | ${displayName} | Time: ${elapsed}ms`, err)
      failCount++
    }
  }

  const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)

  // 4. Restore original settings
  log('\n=============================================================')
  log('[Settings] Restoring original user settings...')
  settingsService.saveSettings(originalSettings)

  // 5. Final Report
  log('\n=============================================================')
  log('🎉 Legacy Asset OCR Color Refresh Complete!')
  log('=============================================================')
  log(`Total Assets Scanned : ${totalScanned}`)
  log(`Eligible Processed   : ${totalEligible}`)
  log(`Successfully Refreshed: ${successCount}`)
  log(`Skipped (Up-to-date)  : ${skippedAssets.length}`)
  log(`Failed (Errors logged): ${failCount}`)
  log(`Total Time Elapsed    : ${totalElapsedSec} seconds`)
  log('=============================================================')

  app.exit(failCount > 0 ? 1 : 0)
}

// Wait for Electron app to be ready before starting
app.whenReady().then(() => {
  main().catch(err => {
    logError('Fatal batch refresh runner crash', err)
    app.exit(1)
  })
})
