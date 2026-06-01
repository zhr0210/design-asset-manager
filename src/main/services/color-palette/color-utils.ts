// Pure color helpers shared by palette extraction and tests.

// --- Color Conversion Helpers ---

export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace(/^#/, '')
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return [r, g, b]
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.slice(0, 2), 16)
    const g = parseInt(cleanHex.slice(2, 4), 16)
    const b = parseInt(cleanHex.slice(4, 6), 16)
    return [r, g, b]
  }
  return [0, 0, 0]
}

export function parseRgb(color: any): [number, number, number] {
  if (!color) return [0, 0, 0]
  if (typeof color === 'string' && color.startsWith('#')) {
    return hexToRgb(color)
  }
  if (Array.isArray(color)) return color as [number, number, number]
  if (typeof color.array === 'function') return color.array() as [number, number, number]
  if (typeof color.rgb === 'function') {
    const obj = color.rgb()
    return [obj.r ?? obj._r ?? 0, obj.g ?? obj._g ?? 0, obj.b ?? obj._b ?? 0]
  }
  const r = color.r ?? color._r ?? color[0] ?? 0
  const g = color.g ?? color._g ?? color[1] ?? 0
  const b = color.b ?? color._b ?? color[2] ?? 0
  return [r, g, b]
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.round(c).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// --- Color Categorization Helpers ---

export function classifyColorFamily(h: number, s: number, l: number): string {
  if (l < 12) return '黑色系'
  if (l > 88 && s < 12) return '白色系'
  if (s < 12) return '灰色系'

  // Golden & Beige
  if (h >= 30 && h <= 60) {
    if (s >= 35 && s <= 95 && l >= 40 && l <= 75) return '金色系'
    if (s >= 10 && s <= 60 && l >= 75 && l <= 95) return '米色系'
  }

  // Browns
  if (h >= 15 && h <= 45 && s >= 15 && s <= 70 && l >= 12 && l <= 50) {
    return '棕色系'
  }

  // Standard Hues
  if (h >= 330 || h < 15) {
    if (l > 50 && s > 30) return '粉色系'
    return '红色系'
  }
  if (h >= 15 && h < 45) return '橙色系'
  if (h >= 45 && h < 70) return '黄色系'
  if (h >= 70 && h < 160) return '绿色系'
  if (h >= 160 && h < 200) return '青色系'
  if (h >= 200 && h < 250) return '蓝色系'
  if (h >= 250 && h < 290) return '紫色系'
  if (h >= 290 && h < 330) return '粉色系'

  return '灰色系'
}

export function getColorDistance(hsl1: [number, number, number], hsl2: [number, number, number]): number {
  const dh = Math.min(Math.abs(hsl1[0] - hsl2[0]), 360 - Math.abs(hsl1[0] - hsl2[0])) / 180;
  const ds = (hsl1[1] - hsl2[1]) / 100;
  const dl = (hsl1[2] - hsl2[2]) / 100;
  return Math.sqrt(dh * dh * 0.5 + ds * ds * 0.25 + dl * dl * 0.25);
}

export function parseTextBoxes(textBlocks: any[] | null | undefined): any[] {
  if (!textBlocks || !Array.isArray(textBlocks)) return []
  const results: any[] = []
  for (const block of textBlocks) {
    if (!block) continue
    
    // If block has "box" array
    if (Array.isArray(block.box) && block.box.length === 4) {
      const box = block.box
      // Standard Qwen-VL / Florence-2 box format: [ymin, xmin, ymax, xmax]
      // Usually normalized to 1000, e.g. [100, 100, 200, 300]
      const ymin = Number(box[0] ?? 0)
      const xmin = Number(box[1] ?? 0)
      const ymax = Number(box[2] ?? 0)
      const xmax = Number(box[3] ?? 0)
      
      const isNormalized1000 = ymin > 1.1 || xmin > 1.1 || ymax > 1.1 || xmax > 1.1
      const scale = isNormalized1000 ? 1000 : 1
      
      const y = ymin / scale
      const x = xmin / scale
      const h = Math.max(0, ymax - ymin) / scale
      const w = Math.max(0, xmax - xmin) / scale
      
      results.push({ x, y, w, h, text: block.text || '' })
    } 
    // If block already has x, y, w, h or left, top, width, height properties
    else if (block.x !== undefined || block.left !== undefined) {
      results.push(block)
    }
  }
  return results
}


// --- Fallback Hsl to Rgb Helper ---

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  let r = l, g = l, b = l;
  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
