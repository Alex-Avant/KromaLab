/* ------------------------------------------------------------------ */
/* Render de exportación compartido (worker y fallback inline).        */
/* Render por tiles compuestos en un lienzo 2D a resolución completa,  */
/* para no depender del tamaño máximo de renderbuffer de la GPU.       */
/* ------------------------------------------------------------------ */

import { HalftoneEngineCore } from "@/lib/halftone/engine-core";
import { encodeTiff1Bit } from "@/lib/halftone/tiff";
import {
  EXPORT_MAX_PX,
  TILE_SIZE,
  type ExportFormat,
  type ExportScale,
  type HalftoneSettings,
} from "@/lib/halftone/types";

export type ExportResult = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  mime: string;
};

export async function renderExport(
  bitmap: ImageBitmap,
  imageWidth: number,
  imageHeight: number,
  settings: HalftoneSettings,
  format: ExportFormat,
  scale: ExportScale
): Promise<ExportResult> {
  const outW = imageWidth * scale;
  const outH = imageHeight * scale;
  if (outW > EXPORT_MAX_PX || outH > EXPORT_MAX_PX) {
    throw new Error(
      `El tamaño de exportación (${outW} × ${outH} px) supera el límite ` +
        `de ${EXPORT_MAX_PX} px. Reduce la escala.`
    );
  }

  // La película se exporta siempre sobre fondo transparente.
  const exportSettings: HalftoneSettings = { ...settings, bg: "transparent" };

  const big = new OffscreenCanvas(outW, outH);
  const ctx2d = big.getContext("2d");
  if (!ctx2d) throw new Error("Sin contexto 2D para la composición.");

  const tile = Math.min(TILE_SIZE, outW, outH);
  const tileEngine = new HalftoneEngineCore(new OffscreenCanvas(tile, tile));
  tileEngine.setBitmap(bitmap);

  // Coordenadas: `y` recorre el lienzo de salida de arriba a abajo (2D),
  // pero gl_FragCoord y el origen del tile son de abajo a arriba (GL).
  // El origen GL del tile es, por tanto, outH - y - th.
  for (let y = 0; y < outH; y += tile) {
    for (let x = 0; x < outW; x += tile) {
      const tw = Math.min(tile, outW - x);
      const th = Math.min(tile, outH - y);
      tileEngine.render(exportSettings, imageWidth, outW, outH, {
        originX: x,
        originY: outH - y - th,
        viewportWidthPx: tw,
        viewportHeightPx: th,
        forceHardEdge: format === "tiff",
      });
      // El viewport GL ocupa la esquina inferior izquierda del tile
      // (filas [tile - th, tile) en el bitmap superior-inferior).
      const tileBitmap = tileEngine.canvas.transferToImageBitmap();
      ctx2d.drawImage(tileBitmap, 0, tile - th, tw, th, x, y, tw, th);
      tileBitmap.close();
    }
  }
  tileEngine.dispose();

  if (format === "png") {
    const blob = await big.convertToBlob({ type: "image/png" });
    return {
      buffer: await blob.arrayBuffer(),
      width: outW,
      height: outH,
      mime: "image/png",
    };
  }

  // TIFF 1-bit: empaquetado por filas (bit 0 = tinta, WhiteIsZero).
  const stride = Math.ceil(outW / 8);
  const packed = new Uint8Array(stride * outH);
  for (let r = 0; r < outH; r++) {
    const row = ctx2d.getImageData(0, r, outW, 1).data;
    for (let x = 0; x < outW; x++) {
      if (row[x * 4 + 3] < 128) {
        packed[r * stride + (x >> 3)] |= 1 << (7 - (x & 7));
      }
    }
  }
  const tiff = encodeTiff1Bit(packed, outW, outH);
  return {
    buffer: tiff.buffer as ArrayBuffer,
    width: outW,
    height: outH,
    mime: "image/tiff",
  };
}
