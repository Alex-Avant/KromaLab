/* ------------------------------------------------------------------ */
/* Planificación pura de la exportación (sin DOM/GPU).                 */
/*                                                                     */
/* Centraliza la aritmética que antes vivía dispersa en renderExport:  */
/* tamaño de salida, DPI efectivo, rejilla de tiles y empaquetado de   */
/* tinta 1-bit. Así se puede verificar en Node que no faltan regiones, */
/* que no hay solapes y que la tinta no se invierte.                   */
/* ------------------------------------------------------------------ */

import {
  EXPORT_DPI,
  TILE_SIZE,
  type ExportScale,
  type HalftoneSettings,
} from "@/lib/halftone/types";

export type ExportSize = {
  width: number;
  height: number;
  /** DPI efectivos del archivo final (300 × escala). */
  dpi: number;
};

/**
 * Tamaño de salida y DPI. La escala multiplica la resolución manteniendo
 * el tamaño físico: 1× = 300 DPI, 2× = 600 DPI, 4× = 1200 DPI.
 */
export function exportOutputSize(
  imageWidth: number,
  imageHeight: number,
  scale: ExportScale
): ExportSize {
  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    dpi: EXPORT_DPI * scale,
  };
}

export type ExportTile = {
  /** Origen en coordenadas 2D (arriba-izquierda) del lienzo final. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Origen Y en coordenadas GL (abajo-izquierda) del lienzo final. */
  glOriginY: number;
  /** Fila inicial a recortar del bitmap del tile (top-down). */
  cropY: number;
};

/**
 * Rejilla de tiles que cubre exactamente el lienzo: sin huecos ni
 * solapes. Un lector puede sumar las áreas y comparar con width×height.
 */
export function planTiles(
  width: number,
  height: number,
  maxTile: number = TILE_SIZE
): { tile: number; canvas: number; tiles: ExportTile[] } {
  const tile = Math.min(maxTile, width, height);
  // El lienzo del motor es fijo para poder reutilizarlo entre exports y
  // no agotar contextos WebGL.
  const canvas = maxTile;
  const tiles: ExportTile[] = [];
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const w = Math.min(tile, width - x);
      const h = Math.min(tile, height - y);
      tiles.push({
        x,
        y,
        w,
        h,
        glOriginY: height - y - h,
        cropY: canvas - h,
      });
    }
  }
  return { tile, canvas, tiles };
}

/** La exportación siempre es una película transparente. */
export function transparentExportSettings(
  settings: HalftoneSettings
): HalftoneSettings {
  return { ...settings, bg: "transparent" };
}

/**
 * Tinta 1-bit: un píxel con alfa ≥ 128 contiene punto (bit 1).
 * El fondo transparente queda a 0 (blanco en WhiteIsZero).
 */
export function isInkAlpha(alpha: number): boolean {
  return alpha >= 128;
}

/** Empaqueta una fila RGBA a bits MSB-first (1 = tinta). */
export function packInkRowFromRgba(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number
): Uint8Array {
  const row = new Uint8Array(Math.ceil(width / 8));
  for (let x = 0; x < width; x++) {
    if (isInkAlpha(rgba[x * 4 + 3])) {
      row[x >> 3] |= 1 << (7 - (x & 7));
    }
  }
  return row;
}

/** Cuenta píxeles de tinta de una fila RGBA. */
export function countInkRow(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number
): number {
  let count = 0;
  for (let x = 0; x < width; x++) {
    if (isInkAlpha(rgba[x * 4 + 3])) count += 1;
  }
  return count;
}
