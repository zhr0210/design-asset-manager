import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from '../src/main/db/index';
import { ColorPaletteService } from '../src/main/services/color-palette.service';
import { SettingsService } from '../src/main/services/settings.service';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function main() {
    console.log('=============================================================');
    console.log('🌟 Legacy Design Asset OCR Color Palette Refresh Tool');
    console.log('=============================================================');
    const force = process.argv.includes('--force');
    if (force) {
        console.log('🔥 Mode: FORCE REFRESH (All scanned assets will be re-processed)');
    }
    else {
        console.log('⚡ Mode: DELTA REFRESH (Only processing legacy or skipped assets)');
    }
    // 1. Init database connection
    console.log('\n[SQLite] Initializing SQLite connection...');
    let db;
    try {
        db = initDatabase();
        console.log('✅ SQLite connected successfully.');
    }
    catch (err) {
        console.error('❌ Failed to connect to database:', err);
        process.exit(1);
    }
    // 2. Override settings for bulk execution
    const settingsService = SettingsService.getInstance();
    const originalSettings = { ...settingsService.getSettings() };
    console.log('[Settings] Dynamic override: Enforcing EasyOCR text color analysis for bulk run.');
    settingsService.saveSettings({
        enableTextColorAnalysis: true,
        textBoxProvider: 'easyocr',
        ocrTimeoutMs: 15000,
        maxTextBoxesPerImage: 30
    });
    // 3. Fetch assets
    console.log('[SQLite] Scanning assets in the database...');
    const assets = db.prepare('SELECT id, file_path, color_palette_json, file_name FROM assets').all();
    const totalScanned = assets.length;
    console.log(`🔍 Scanned ${totalScanned} assets from the library.`);
    const eligibleAssets = [];
    const skippedAssets = [];
    for (const asset of assets) {
        let needsRefresh = false;
        if (force || !asset.color_palette_json) {
            needsRefresh = true;
        }
        else {
            try {
                const palette = JSON.parse(asset.color_palette_json);
                // Check if text swatches or color palette details are missing/skipped
                const textPalette = palette.text_palette;
                if (!textPalette ||
                    !textPalette.swatches ||
                    textPalette.swatches.length === 0 ||
                    textPalette.status !== 'success' ||
                    textPalette.isMock === true) {
                    needsRefresh = true;
                }
            }
            catch (err) {
                needsRefresh = true;
            }
        }
        if (needsRefresh) {
            eligibleAssets.push(asset);
        }
        else {
            skippedAssets.push(asset);
        }
    }
    const totalEligible = eligibleAssets.length;
    console.log(`📊 Delta analysis complete:`);
    console.log(`   - Eligible for refresh: ${totalEligible}`);
    console.log(`   - Already up-to-date (Skipped): ${skippedAssets.length}`);
    if (totalEligible === 0) {
        console.log('\n🎉 No assets require a refresh. Your library is fully up to date!');
        console.log('Restoring settings...');
        settingsService.saveSettings(originalSettings);
        process.exit(0);
    }
    console.log(`\n🚀 Commencing EasyOCR + OpenCV batch processing on ${totalEligible} assets...`);
    console.log('=============================================================');
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    const service = new ColorPaletteService();
    for (let i = 0; i < totalEligible; i++) {
        const asset = eligibleAssets[i];
        const index = i + 1;
        const displayName = asset.file_name || path.basename(asset.file_path);
        const itemStart = Date.now();
        console.log(`[${index}/${totalEligible}] ⏳ Processing: ${displayName} (ID: ${asset.id})...`);
        try {
            // Execute the color palette extraction and save directly to SQLite
            await service.extractAndSavePalette(asset.id, asset.file_path);
            const elapsed = Date.now() - itemStart;
            console.log(`[${index}/${totalEligible}] ✅ SUCCESS | ${displayName} | Time: ${elapsed}ms`);
            successCount++;
        }
        catch (err) {
            const elapsed = Date.now() - itemStart;
            console.error(`[${index}/${totalEligible}] ❌ FAILED  | ${displayName} | Time: ${elapsed}ms | Error:`, err);
            failCount++;
        }
    }
    const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    // 4. Restore original settings
    console.log('\n=============================================================');
    console.log('[Settings] Restoring original user settings...');
    settingsService.saveSettings(originalSettings);
    // 5. Final Report
    console.log('\n=============================================================');
    console.log('🎉 Legacy Asset OCR Color Refresh Complete!');
    console.log('=============================================================');
    console.log(`Total Assets Scanned : ${totalScanned}`);
    console.log(`Eligible Processed   : ${totalEligible}`);
    console.log(`Successfully Refreshed: ${successCount}`);
    console.log(`Skipped (Up-to-date)  : ${skippedAssets.length}`);
    console.log(`Failed (Errors logged): ${failCount}`);
    console.log(`Total Time Elapsed    : ${totalElapsedSec} seconds`);
    console.log('=============================================================');
    process.exit(failCount > 0 ? 1 : 0);
}
main().catch(err => {
    console.error('Fatal batch refresh runner crash:', err);
    process.exit(1);
});
