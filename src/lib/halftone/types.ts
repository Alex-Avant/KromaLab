/* ------------------------------------------------------------------ */
/* Tipos y matemática pura del motor de semitonos.                     */
/* Sin dependencias de DOM/WebGL — testeable en Node.                  */
/* ------------------------------------------------------------------ */

export type DotShape = "round" | "ellipse" | "diamond" | "line";

/**
 * Escala del radio de cada forma para que el área del punto sea
 * aproximadamente proporcional a la cobertura de tinta. En coordenadas
 * de célula: círculo dist=length(f*2), elipse dist=length(f*(2,3.64)) y
 * diamante dist=(|x|+|y|)*sqrt(2).
 */
export const DOT_RADIUS_SCALE: Record<DotShape, number> = {
  round: 1.1283791670955126, // 2 / sqrt(pi)
  ellipse: 1.5222667215103918, // sqrt(2 * 3.64 / pi)
  diamond: 1,
  line: 1,
};

export type InkMode = "luminance" | "white";

/** Procesamiento tonal: color original o escala de grises. */
export type ColorMode = "color" | "grayscale";

export type GarmentBg = "transparent" | "black" | "white";

export type HalftoneSettings = {
  /** Frecuencia de trama en líneas por pulgada (10–120). */
  lpi: number;
  /** Ángulo de trama en grados (0–90). */
  angle: number;
  /** Forma geométrica del punto. */
  shape: DotShape;
  /** Contraste aplicado a la luminancia (-100…100, 0 = neutro). */
  contrast: number;
  /** Gamma de luminancia (0.2–3.0, 1 = neutro). */
  gamma: number;
  /** Umbral mínimo de tinta (0–100): elimina puntos de ruido. */
  minThreshold: number;
  /** Invierte la trama (positivo ↔ negativo). */
  invert: boolean;
  /** Luminancia (trama DTF estándar) o canal de tinta blanca separada. */
  mode: InkMode;
  /** Color original o escala de grises para la trama. */
  colorMode: ColorMode;
  /** Fondo de la vista de prueba. */
  bg: GarmentBg;
};

export const LPI_MIN = 10;
export const LPI_MAX = 120;
export const ANGLE_MIN = 0;
export const ANGLE_MAX = 90;
export const CONTRAST_MIN = -100;
export const CONTRAST_MAX = 100;
export const GAMMA_MIN = 0.2;
export const GAMMA_MAX = 3;
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 100;
export const MAX_INPUT_PX = 4096;
export const PREVIEW_MAX_PX = 1600;
export const EXPORT_DPI = 300;
export const EXPORT_MAX_PX = 8192;
export const TILE_SIZE = 2048;

export type ExportFormat = "png" | "tiff";
export type ExportScale = 1 | 2 | 4;

/** Diagnóstico de una exportación (visible en avanzado). */
export type ExportDiagnostics = {
  width: number;
  height: number;
  dpi: number;
  mime: string;
  tiles: number;
  alpha: boolean;
  totalPixels: number;
  transparentPixels: number;
  inkPixels: number;
};

export const EXPORT_SCALES: ExportScale[] = [1, 2, 4];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  png: "PNG con transparencia",
  tiff: "TIFF 1-bit",
};

export const DEFAULT_SETTINGS: HalftoneSettings = {
  lpi: 55,
  angle: 45,
  shape: "round",
  contrast: 0,
  gamma: 1,
  minThreshold: 0,
  invert: false,
  mode: "luminance",
  colorMode: "color",
  bg: "transparent",
};

/** Ángulos con snap visual en el slider (15/45/75). */
export const ANGLE_SNAPS = [15, 45, 75];

/** Snap de ángulo: si |a - snap| ≤ tol, devuelve el snap. */
export function snapAngle(angle: number, tolerance = 2): number {
  for (const snap of ANGLE_SNAPS) {
    if (Math.abs(angle - snap) <= tolerance) return snap;
  }
  return angle;
}

/**
 * Tamaño de célula de trama en píxeles.
 * Células por pulgada = LPI; píxeles por pulgada = DPI ⇒ px/célula = DPI/LPI.
 */
export function cellSizePx(lpi: number, dpi: number): number {
  return dpi / lpi;
}

/** DPI efectivo del preview: 300 DPI escalados a la resolución de preview. */
export function previewDpi(imageWidthPx: number, previewWidthPx: number): number {
  return (EXPORT_DPI * previewWidthPx) / imageWidthPx;
}

/** Resolución de preview limitada a PREVIEW_MAX_PX en el lado mayor. */
export function previewSize(
  width: number,
  height: number
): { width: number; height: number } {
  const maxDim = Math.max(width, height);
  if (maxDim <= PREVIEW_MAX_PX) return { width, height };
  const scale = PREVIEW_MAX_PX / maxDim;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Número de células de trama en el eje horizontal del preview. */
export function cellCountAcross(
  imageWidthPx: number,
  previewWidthPx: number,
  lpi: number
): number {
  return Math.round(previewWidthPx / cellSizePx(lpi, previewDpi(imageWidthPx, previewWidthPx)));
}

/** Tamaño físico del export a DPI dado. */
export function physicalSizeCm(widthPx: number, heightPx: number, dpi = EXPORT_DPI) {
  return {
    widthCm: (widthPx / dpi) * 2.54,
    heightCm: (heightPx / dpi) * 2.54,
  };
}

/** Redimensiona manteniendo proporción y límite MAX_INPUT_PX. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_INPUT_PX
): { width: number; height: number; resized: boolean } {
  const maxDim = Math.max(width, height);
  if (maxDim <= max) return { width, height, resized: false };
  const scale = max / maxDim;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

/** ARIA valuetext para sliders del editor. */
export function lpiValuetext(lpi: number): string {
  return `${lpi} líneas por pulgada`;
}

export function angleValuetext(angle: number): string {
  return `${angle} grados`;
}

export function percentValuetext(value: number): string {
  return `${value} por ciento`;
}

export const SHAPE_LABELS: Record<DotShape, string> = {
  round: "Redondo",
  ellipse: "Elipse",
  diamond: "Diamante",
  line: "Línea",
};

export const MODE_LABELS: Record<InkMode, string> = {
  luminance: "Luminancia",
  white: "Tinta blanca",
};

export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  color: "Color original",
  grayscale: "Escala de grises",
};

/** Tinta blanca DTF y tinta oscura para la trama en escala de grises. */
export const DOT_WHITE: [number, number, number] = [0.949, 0.957, 0.973];
export const DOT_BLACK: [number, number, number] = [0.08, 0.08, 0.08];

/**
 * Decide el color del punto para un ajuste dado:
 *  - Color original: el shader usa el color muestreado de la imagen.
 *  - Escala de grises: tinta oscura uniforme.
 *  - Tinta blanca: canal DTF blanco (siempre uniforme).
 */
export function resolveInkColor(settings: HalftoneSettings): {
  useSourceColor: boolean;
  dotColor: [number, number, number];
} {
  if (settings.mode === "white") {
    return { useSourceColor: false, dotColor: DOT_WHITE };
  }
  if (settings.colorMode === "color") {
    return { useSourceColor: true, dotColor: DOT_WHITE };
  }
  return { useSourceColor: false, dotColor: DOT_BLACK };
}

export const BG_LABELS: Record<GarmentBg, string> = {
  transparent: "Transparente",
  black: "Prenda negra",
  white: "Prenda blanca",
};
