function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const clamped = Math.min(1, Math.max(0, c));
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/** `<input type="color">` gives sRGB hex; `MaterialDef.baseColor` is stored linear. */
export function hexToLinearRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

export function linearRgbToHex(rgb: [number, number, number]): string {
  const toByte = (c: number) => Math.round(linearToSrgb(c) * 255);
  const hex = rgb.map((c) => toByte(c).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`;
}
