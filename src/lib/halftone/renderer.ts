/* ------------------------------------------------------------------ */
/* Interfaz común de los renderizadores de trama y fábrica con         */
/* detección automática: WebGPU (compute shader WGSL) → WebGL2.        */
/* ------------------------------------------------------------------ */

import { HalftoneEngineCore, type RenderOptions } from "@/lib/halftone/engine-core";
import type { HalftoneSettings } from "@/lib/halftone/types";

export interface HalftoneRenderer {
  readonly kind: "webgpu" | "webgl2";
  readonly canvas: OffscreenCanvas;
  setBitmap(bitmap: ImageBitmap): void;
  render(
    settings: HalftoneSettings,
    imageWidthPx: number,
    outputWidthPx: number,
    outputHeightPx: number,
    opts?: RenderOptions
  ): number | Promise<number>;
  dispose(): void;
}

/**
 * Elige el mejor renderizador disponible: WebGPU si el navegador lo
 * expone (con fallback silencioso ante adaptador/dispositivo nulos),
 * WebGL2 en caso contrario. Comparte un único protocolo.
 */
export async function createBestRenderer(
  canvas: OffscreenCanvas
): Promise<HalftoneRenderer> {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      });
      if (adapter) {
        const device = await adapter.requestDevice();
        const { WebGPURenderer } = await import(
          "@/lib/halftone/webgpu-renderer"
        );
        return new WebGPURenderer(canvas, device);
      }
    } catch {
      // Caer a WebGL2: la capa WebGPU es una mejora, no un requisito.
    }
  }
  return new HalftoneEngineCore(canvas);
}
