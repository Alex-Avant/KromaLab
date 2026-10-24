/* ------------------------------------------------------------------ */
/* Interfaz común de los renderizadores de trama y fábrica con         */
/* detección automática: WebGPU (compute shader WGSL) → WebGL2.        */
/*                                                                     */
/* La creación de la GPU está acotada por timeout: en algunos drivers  */
/* móviles requestAdapter/requestDevice pueden quedarse colgados sin   */
/* resolver ni rechazar, dejando el preview en blanco para siempre.    */
/* Si WebGPU no responde o falla la validación, se cae a WebGL2 sobre  */
/* un lienzo limpio (el contexto WebGPU se configura solo después de   */
/* validar los pipelines).                                             */
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

export type RendererErrorHandler = (message: string) => void;

export type RendererOptions = {
  /** Fuerza WebGL2 (reintento cuando WebGPU no responde). */
  forceWebGL2?: boolean;
};

/** Tiempo máximo para obtener adaptador/dispositivo WebGPU. */
const GPU_TIMEOUT_MS = 1800;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}: sin respuesta en ${ms} ms.`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Renderizador WebGL2 (camino portable y de reserva). */
export function createWebGL2Renderer(canvas: OffscreenCanvas): HalftoneRenderer {
  return new HalftoneEngineCore(canvas);
}

/**
 * Elige el mejor renderizador disponible: WebGPU si el navegador lo
 * expone y la validación pasa (con timeout), WebGL2 en caso contrario.
 */
export async function createBestRenderer(
  canvas: OffscreenCanvas,
  onError?: RendererErrorHandler,
  opts: RendererOptions = {}
): Promise<HalftoneRenderer> {
  if (
    !opts.forceWebGL2 &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator
  ) {
    let device: GPUDevice | null = null;
    try {
      const adapter = await withTimeout(
        navigator.gpu.requestAdapter({ powerPreference: "high-performance" }),
        GPU_TIMEOUT_MS,
        "WebGPU (adaptador)"
      );
      if (adapter) {
        device = await withTimeout(
          adapter.requestDevice(),
          GPU_TIMEOUT_MS,
          "WebGPU (dispositivo)"
        );
        const { WebGPURenderer } = await import(
          "@/lib/halftone/webgpu-renderer"
        );
        return await WebGPURenderer.create(canvas, device, onError);
      }
    } catch (err) {
      // Liberar el dispositivo si la validación falló y caer a WebGL2.
      device?.destroy();
      const reason = err instanceof Error ? err.message : String(err);
      onError?.(`WebGPU no disponible (${reason}). Usando WebGL2.`);
    }
  }
  return createWebGL2Renderer(canvas);
}
