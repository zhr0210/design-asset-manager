import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  createVisualAnalysisSnapshot,
  parseVisualAnalysisPalette
} from '../src/shared/workflows/visual-analysis-snapshot.workflow'

assert.equal(parseVisualAnalysisPalette('not-json'), null)
assert.equal(parseVisualAnalysisPalette(null), null)

const legacySnapshot = createVisualAnalysisSnapshot({
  ocrText: 'hello OCR',
  ocrSource: 'rapidocr',
  ocrUpdatedAt: '2026-06-04T00:00:00.000Z',
  colorPaletteJson: JSON.stringify({
    image_palette: {
      dominant: { hex: '#ABCDEF', family: '蓝色系', rgb: [171, 205, 239] },
      swatches: [{
        hex: '#111111',
        rgb: [17, 17, 17],
        hsl: [0, 0, 7],
        role: 'primary',
        family: '黑色系',
        contrastWhite: 18.9,
        contrastBlack: 1.1
      }],
      themes: { isWarm: true, hasBlackGold: true, backgroundType: 'dark' }
    },
    text_palette: {
      status: 'success',
      provider: 'rapidocr',
      duration_ms: 42,
      detected_text_box_count: 2,
      processed_text_box_count: 1,
      readabilityAverage: 0.76,
      swatches: [
        { hex: '#FFFFFF', rgb: [255, 255, 255], hsl: [0, 0, 100], role: 'text_primary', confidence: 0.9, from_boxes: 3 },
        { hex: '#000000', role: 'text_background', from_boxes: 2 }
      ]
    }
  })
})

assert.equal(legacySnapshot.hasPalette, true)
assert.equal(legacySnapshot.imageSwatches[0].hex, '#111111')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].percentage, 10)
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].percentageLabel, '10%')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].roleLabel, '主色调')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].rgbCopyValue, 'rgb(17, 17, 17)')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].hslCopyValue, 'hsl(0, 0%, 7%)')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].cssVariable, '--color-primary: #111111;')
assert.equal(legacySnapshot.imageSwatchesForDisplay[0].contrastLabel, '18.9:1.1')
assert.equal(legacySnapshot.themes.isWarm, true)
assert.deepEqual(legacySnapshot.themePills.map((pill) => pill.code), ['warm', 'black_gold', 'dark_background'])
assert.equal(legacySnapshot.themePills[0].label, '暖色调')
assert.equal(legacySnapshot.dominantColor?.hex, '#ABCDEF')
assert.equal(legacySnapshot.dominantColor?.family, '蓝色系')
assert.equal(legacySnapshot.dominantColor?.rgbLabel, '171, 205, 239')
assert.equal(legacySnapshot.textForegrounds.length, 1)
assert.equal(legacySnapshot.textBackground?.hex, '#000000')
assert.equal(legacySnapshot.textBackground?.sourceCount, 2)
assert.equal(legacySnapshot.isTextSuccess, true)
assert.equal(legacySnapshot.textProvider, 'rapidocr')
assert.equal(legacySnapshot.textDurationMs, 42)
assert.equal(legacySnapshot.detectedTextBoxCount, 2)
assert.equal(legacySnapshot.textColorPanel.state, 'success')
assert.equal(legacySnapshot.textColorPanel.showTextPalette, true)
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].percentage, 90)
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].isDark, false)
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].textColor, '#000000')
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].roleLabel, '配色')
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].confidenceLabel, '90%')
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].textBoxesLabel, '3 个')
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].rgbValueLabel, '255, 255, 255')
assert.equal(legacySnapshot.textColorPanel.foregroundSwatches[0].hslValueLabel, '0°, 0%, 100%')
assert.equal(legacySnapshot.textColorPanel.background?.hex, '#000000')
assert.equal(legacySnapshot.textColorPanel.background?.sourceCount, 2)
assert.equal(legacySnapshot.textColorPanel.background?.sourceCountLabel, '分析自 2 个提取的文字框')
assert.equal(legacySnapshot.textInsightSummary.hasOcrText, true)
assert.equal(legacySnapshot.textInsightSummary.ocrTextLength, 9)
assert.equal(legacySnapshot.textInsightSummary.ocrSource, 'rapidocr')
assert.equal(legacySnapshot.textInsightSummary.textBoxCount, 2)
assert.equal(legacySnapshot.textInsightSummary.processedTextBoxCount, 1)
assert.equal(legacySnapshot.textInsightSummary.readabilityAverage, 0.76)
assert.equal(legacySnapshot.textInsightSummary.readabilityLabel, '76%')
assert.equal(legacySnapshot.textInsightSummary.ocrTextLengthLabel, '9 字符')
assert.equal(legacySnapshot.textInsightSummary.textBoxRatioLabel, '2 / 1')
assert.equal(legacySnapshot.textColorPanel.durationMsLabel, '42ms')
assert.equal(legacySnapshot.textColorPanel.detectedTextBoxCountLabel, '2 框')
assert.equal(legacySnapshot.textInsightSummary.shouldShow, true)

const modernSnapshot = createVisualAnalysisSnapshot({
  colorPaletteJson: {
    image_palette: {
      colors: [{ hex: '#222222' }]
    },
    text_palette: {
      textColorStatus: 'success',
      colors: [{ hex: '#EFEFEF', role: 'text_primary' }],
      background_colors: ['#101010'],
      processed_text_box_count: 3
    }
  }
})

assert.equal(modernSnapshot.imageSwatches[0].hex, '#222222')
assert.equal(modernSnapshot.textForegrounds[0].hex, '#EFEFEF')
assert.equal(modernSnapshot.textBackground?.hex, '#101010')
assert.equal(modernSnapshot.textBackground?.sourceCount, 3)
assert.equal(modernSnapshot.textBackground?.sourceCountLabel, '分析自 3 个提取的文字框')
assert.equal(modernSnapshot.textColorPanel.background?.hex, '#101010')
assert.equal(modernSnapshot.textColorPanel.background?.sourceCount, 3)
assert.equal(modernSnapshot.textColorPanel.background?.sourceCountLabel, '分析自 3 个提取的文字框')
assert.equal(modernSnapshot.isTextSuccess, true)

const extractorFieldSnapshot = createVisualAnalysisSnapshot({
  colorPaletteJson: {
    text_palette: {
      status: 'success',
      colors: [{
        hex: '#F0F0F0',
        role: 'text_primary',
        confidence: 0.8,
        fromBoxes: 4
      }]
    }
  }
})

assert.equal(extractorFieldSnapshot.textColorPanel.foregroundSwatches[0].textBoxesLabel, '4 个')

const skippedSnapshot = createVisualAnalysisSnapshot({
  colorPaletteJson: {
    text_palette: {
      status: 'skipped',
      skipReason: 'no_text_detected'
    }
  }
})

assert.equal(skippedSnapshot.textColorPanel.state, 'skipped')
assert.equal(skippedSnapshot.textColorPanel.message, '文字颜色分析已跳过：未检测到任何文字')
assert.equal(skippedSnapshot.textColorPanel.showTextPalette, false)

const failedSnapshot = createVisualAnalysisSnapshot({
  colorPaletteJson: {
    text_palette: {
      status: 'failed',
      warnings: ['ocr timeout', 404]
    }
  }
})

assert.equal(failedSnapshot.textColorPanel.state, 'failed')
assert.equal(failedSnapshot.textColorPanel.message, '文字颜色分析失败')
assert.deepEqual(failedSnapshot.textColorPanel.warnings, ['ocr timeout', '404'])

const textBoxReadabilitySnapshot = createVisualAnalysisSnapshot({
  colorPaletteJson: {
    text_palette: {
      provider: 'paddleocr',
      text_boxes: [
        { readability_score: 0.25 },
        { readability_score: 1.25 },
        { readability_score: 'ignored' }
      ]
    }
  }
})

assert.equal(textBoxReadabilitySnapshot.textInsightSummary.ocrSource, 'paddleocr')
assert.equal(textBoxReadabilitySnapshot.textInsightSummary.textBoxCount, 3)
assert.equal(textBoxReadabilitySnapshot.textInsightSummary.processedTextBoxCount, 3)
assert.equal(textBoxReadabilitySnapshot.textInsightSummary.readabilityAverage, 0.75)
assert.equal(textBoxReadabilitySnapshot.textInsightSummary.readabilityLabel, '75%')
assert.equal(textBoxReadabilitySnapshot.textInsightSummary.shouldShow, true)

const emptySnapshot = createVisualAnalysisSnapshot({ colorPaletteJson: '{broken' })
assert.equal(emptySnapshot.hasPalette, false)
assert.deepEqual(emptySnapshot.imageSwatches, [])
assert.deepEqual(emptySnapshot.textForegrounds, [])

const panelSource = await fs.readFile('src/renderer/components/color/ColorPalettePanel.tsx', 'utf8')
const swatchSource = await fs.readFile('src/renderer/components/color/ColorSwatch.tsx', 'utf8')
assert.match(panelSource, /createVisualAnalysisSnapshot/)
assert.doesNotMatch(panelSource, /asset:\s*any/)
assert.doesNotMatch(panelSource, /color:\s*any/)
assert.doesNotMatch(panelSource, /\(window as any\)/)
assert.doesNotMatch(panelSource, /JSON\.parse\(asset\.color_palette_json\)/)
assert.doesNotMatch(panelSource, /imagePalette\?\.colors\s*\|\| imagePalette\?\.swatches/)
assert.doesNotMatch(panelSource, /textPalette\?\.colors\s*\|\| textPalette\?\.swatches/)
assert.doesNotMatch(panelSource, /skipReason ===/)
assert.doesNotMatch(panelSource, /textPalette\.warnings/)
assert.doesNotMatch(panelSource, /color\.confidence\s*\|\|\s*0/)
assert.doesNotMatch(panelSource, /textInsightSummary\.ocrText\b/)
assert.doesNotMatch(panelSource, /themes\.is|themes\.has|themes\.backgroundType/)
assert.doesNotMatch(panelSource, /imagePalette\?\.dominant/)
assert.doesNotMatch(panelSource, /color\.percentage\s*\?\?\s*10/)
assert.doesNotMatch(panelSource, /snapshot\.textBackground/)
assert.doesNotMatch(panelSource, /ocrTextLength.*字符/)
assert.doesNotMatch(panelSource, /textBoxCount.*processedTextBoxCount/)
assert.doesNotMatch(panelSource, /durationMs.*ms/)
assert.doesNotMatch(panelSource, /detectedTextBoxCount.*框/)
assert.doesNotMatch(panelSource, /分析自.*个提取的文字框/)
assert.match(panelSource, /textColorPanel\.showTextPalette/)
assert.match(panelSource, /textColorPanel\.background/)
assert.match(panelSource, /textInsightSummary\.ocrTextLengthLabel/)
assert.match(panelSource, /textInsightSummary\.textBoxRatioLabel/)
assert.match(panelSource, /textColorPanel\.detectedTextBoxCountLabel/)
assert.match(panelSource, /textColorPanel\.durationMsLabel/)
assert.match(panelSource, /textColorPanel\.background\.sourceCountLabel/)
assert.match(panelSource, /themePills\.map/)
assert.match(panelSource, /dominantColor\.rgbLabel/)
assert.match(swatchSource, /VisualAnalysisImageSwatch/)
assert.match(swatchSource, /color\.roleLabel/)
assert.match(swatchSource, /color\.rgbCopyValue/)
assert.match(swatchSource, /color\.hslCopyValue/)
assert.match(swatchSource, /color\.cssVariable/)
assert.match(swatchSource, /tooltipPosition/)
assert.match(swatchSource, /fixed z-\[9999\]/)
assert.match(swatchSource, /createPortal/)
assert.doesNotMatch(swatchSource, /getRoleLabel/)
assert.doesNotMatch(swatchSource, /color\s+as\s+any/)
assert.doesNotMatch(swatchSource, /Math\.round\(/)
assert.doesNotMatch(swatchSource, /rgb\.join/)
assert.doesNotMatch(swatchSource, /hsl\[/)
assert.doesNotMatch(swatchSource, /absolute z-20 bottom-24/)

const workflowSource = await fs.readFile('src/shared/workflows/visual-analysis-snapshot.workflow.ts', 'utf8')
assert.doesNotMatch(workflowSource, /\bany\b/)

console.log('visual-analysis-snapshot passed')
