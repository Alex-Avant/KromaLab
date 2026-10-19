/* Histograma de luminancia (Rec. 709), 256 bins. Testeable en Node. */
export function luminanceHistogram(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint32Array {
  const bins = new Uint32Array(256);
  const len = width * height;
  for (let i = 0; i < len; i++) {
    const o = i * 4;
    const lum =
      0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    // Math.round: evita que 255.0 caiga en el bin 254 por precisión flotante.
    bins[Math.min(255, Math.round(lum))]++;
  }
  return bins;
}
