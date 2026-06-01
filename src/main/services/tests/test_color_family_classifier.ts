import { classifyColorFamily, rgbToHsl } from '../color-palette.service'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('❌ FAIL:', msg)
    process.exit(1)
  }
  console.log('✅ PASS:', msg)
}

console.log('Starting Color Family Classifier Unit Tests...')

// 1. Test Neutrals (Black, White, Gray)
const deepBlack = rgbToHsl(10, 10, 10)
assert(
  classifyColorFamily(deepBlack[0], deepBlack[1], deepBlack[2]) === '黑色系',
  `Deep black (10, 10, 10) mapped to 黑色系 (got ${classifyColorFamily(deepBlack[0], deepBlack[1], deepBlack[2])})`
)

const pureWhite = rgbToHsl(253, 253, 253)
assert(
  classifyColorFamily(pureWhite[0], pureWhite[1], pureWhite[2]) === '白色系',
  'Pure white mapped to 白色系'
)

const middleGray = rgbToHsl(128, 128, 128)
assert(
  classifyColorFamily(middleGray[0], middleGray[1], middleGray[2]) === '灰色系',
  'Middle gray mapped to 灰色系'
)

// 2. Test Designers Curated Tones (Gold, Beige, Brown)
const premiumGold = rgbToHsl(212, 175, 55) // #D4AF37
assert(
  classifyColorFamily(premiumGold[0], premiumGold[1], premiumGold[2]) === '金色系',
  'Designer gold mapped to 金色系'
)

const warmBeige = rgbToHsl(245, 245, 220) // Beige
assert(
  classifyColorFamily(warmBeige[0], warmBeige[1], warmBeige[2]) === '米色系',
  'Warm beige mapped to 米色系'
)

const deepBrown = rgbToHsl(101, 67, 33) // #654321
assert(
  classifyColorFamily(deepBrown[0], deepBrown[1], deepBrown[2]) === '棕色系',
  'Deep brown mapped to 棕色系'
)

// 3. Test Pure Hue spectrum
const vibrantRed = rgbToHsl(255, 0, 0)
assert(
  classifyColorFamily(vibrantRed[0], vibrantRed[1], vibrantRed[2]) === '红色系',
  'Vibrant red mapped to 红色系'
)

const oceanBlue = rgbToHsl(30, 144, 255)
assert(
  classifyColorFamily(oceanBlue[0], oceanBlue[1], oceanBlue[2]) === '蓝色系',
  'Ocean blue mapped to 蓝色系'
)

console.log('🎉 All Color Family Classifier unit tests passed successfully!')
