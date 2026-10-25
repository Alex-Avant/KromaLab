/* ------------------------------------------------------------------ */
/* Render de exportación compartido (worker y fallback inline).        */
/* Render por tiles compuestos en un lienzo 2D a resolución completa,  */
/* para no depender del tamaño máximo de renderbuffer de la GPU.       */
/* ------------------------------------------------------------------ */

import { HalftoneEngineCore } from "@/lib/halftone/engine-core";
import {
  countInkRow,
  exportOutputSize,
  packInkRowFromRgba,
  planTiles,
  transparentExportSettings,
} from "@/lib/halftone/export-plan";
import { encodePngRgba } from "@/lib/halftone/png";
import { encodeTiff1Bit } from "@/lib/halftone/tiff";
import {
  EXPORT_MAX_PX,
  type ExportDiagnostics,
  type ExportFormat,
  type ExportScale,
  type HalftoneSettings,
} from "@/lib/halftone/types";

export type ExportResult = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  mime: string;
  diagnostics: ExportDiagnostics;
};

let cachedEngine: { size: number; engine: HalftoneEngineCore } | null = null;

/**
 * Motor de exportación reutilizable (un contexto único por proceso).
 * Crear y destruir un contexto WebGL por exportación agota el límite de
 * contextos en algunos navegadores/GPUs.
 */
function getExportEngine(size: number): HalftoneEngineCore {
  if (cachedEngine?.size === size) return cachedEngine.engine;
  cachedEngine?.engine.dispose();
  const engine = new HalftoneEngineCore(new OffscreenCanvas(size, size));
  cachedEngine = { size, engine };
  return engine;
}

export async function renderExport(
  bitmap: ImageBitmap,
  imageWidth: number,
  imageHeight: number,
  settings: HalftoneSettings,
  format: ExportFormat,
  scale: ExportScale
): Promise<ExportResult> {
  const { width: outW, height: outH, dpi } = exportOutputSize(
    imageWidth,
    imageHeight,
    scale
  );
  if (outW > EXPORT_MAX_PX || outH > EXPORT_MAX_PX) {
    throw new Error(
      `El tamaño de exportación (${outW} × ${outH} px) supera el límite ` +
        `de ${EXPORT_MAX_PX} px. Reduce la escala.`
    );
  }

  // La película se exporta siempre sobre fondo transparente; el fondo de
  // prueba del editor no forma parte del archivo.
  const exportSettings = transparentExportSettings(settings);

  const big = new OffscreenCanvas(outW, outH);
  const ctx2d = big.getContext("2d");
  if (!ctx2d) throw new Error("Sin contexto 2D para la composición.");

  const { canvas: canvasSize, tiles } = planTiles(outW, outH);
  const tileEngine = getExportEngine(canvasSize);
  tileEngine.setBitmap(bitmap);
  const totalPixels = outW * outH;

  for (const rect of tiles) {
    tileEngine.render(exportSettings, imageWidth, outW, outH, {
      originX: rect.x,
      // GL trabaja de abajo a arriba: se ancla la fila inferior del tile.
      originY: rect.glOriginY,
      viewportWidthPx: rect.w,
      viewportHeightPx: rect.h,
      forceHardEdge: format === "tiff",
    });
    const tileBitmap = tileEngine.canvas.transferToImageBitmap();
    ctx2d.drawImage(
      tileBitmap,
      0,
      rect.cropY,
      rect.w,
      rect.h,
      rect.x,
      rect.y,
      rect.w,
      rect.h
    );
    tileBitmap.close();
  }

    if (format === "png") {
      // PNG RGBA por filas (alfa conservado, sin convertToBlob).
      let transparentPixels = 0;
      let inkPixels = 0;
      const png = await encodePngRgba(outW, outH, (y) =>
        (() => {
          const row = ctx2d.getImageData(0, y, outW, 1).data;
          for (let x = 0; x < outW; x++) {
            const alpha = row[x * 4 + 3];
            if (alpha < 255) transparentPixels += 1;
            if (alpha >= 128) inkPixels += 1;
          }
          return row;
        })()
      );
      return {
        buffer: png.buffer as ArrayBuffer,
        width: outW,
        height: outH,
        mime: "image/png",
        diagnostics: {
          width: outW,
          height: outH,
          dpi,
          mime: "image/png",
          tiles: tiles.length,
          alpha: transparentPixels > 0,
          totalPixels,
          transparentPixels,
          inkPixels,
        },
      };
    }

    // TIFF 1-bit: bit 1 = tinta (alfa ≥ 128). Fila a fila, MSB-first.
    const stride = Math.ceil(outW / 8);
    const packed = new Uint8Array(stride * outH);
    let inkPixels = 0;
    for (let r = 0; r < outH; r++) {
      const row = ctx2d.getImageData(0, r, outW, 1).data;
      inkPixels += countInkRow(row, outW);
      packed.set(packInkRowFromRgba(row, outW), r * stride);
    }
    const tiff = encodeTiff1Bit(packed, outW, outH, dpi);
    return {
      buffer: tiff.buffer as ArrayBuffer,
      width: outW,
      height: outH,
      mime: "image/tiff",
      diagnostics: {
        width: outW,
        height: outH,
        dpi,
        mime: "image/tiff",
        tiles: tiles.length,
        alpha: false,
        totalPixels,
        transparentPixels: totalPixels - inkPixels,
        inkPixels,
      },
    };
}
