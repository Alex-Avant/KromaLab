/* ------------------------------------------------------------------ */
/* Cliente del motor de semitonos.                                     */
/*                                                                     */
/* Expone una interfaz única con dos implementaciones:                 */
/*  - HalftoneClient: Web Worker + OffscreenCanvas (recomendado).      */
/*  - InlineHalftoneClient: fallback en el hilo principal, con el      */
/*    mismo renderizador GLSL y coalescing por rAF.                    */
/*                                                                     */
/* La imagen original vive solo en estos objetos (nunca en el store    */
/* ni en React) y se transfiere sin copia al worker.                   */
/* ------------------------------------------------------------------ */

import { renderExport, type ExportResult } from "@/lib/halftone/export-render";
import { luminanceHistogram } from "@/lib/halftone/histogram";
import { createBestRenderer, type HalftoneRenderer } from "@/lib/halftone/renderer";
import type { MainMessage } from "@/lib/halftone/protocol";
import {
  type ExportFormat,
  type ExportScale,
  type HalftoneSettings,
  previewSize,
} from "@/lib/halftone/types";

export type FramePayload = { bitmap: ImageBitmap; renderMs: number };
export type GpuApi = "webgpu" | "webgl2";

export interface HalftoneClientLike {
  readonly kind: "worker" | "inline";
  init(
    bitmap: ImageBitmap,
    imageWidth: number,
    imageHeight: number,
    options?: { preview?: boolean }
  ): void;
  update(settings: HalftoneSettings): void;
  export(
    settings: HalftoneSettings,
    format: ExportFormat,
    scale: ExportScale
  ): Promise<ExportResult>;
  dispose(): void;
  onReady: ((api: GpuApi) => void) | null;
  onFrame: ((frame: FramePayload) => void) | null;
  onHistogram: ((bins: Uint32Array) => void) | null;
  onError: ((message: string) => void) | null;
}

export class HalftoneClient implements HalftoneClientLike {
  readonly kind = "worker" as const;
  private worker: Worker;
  private settings: HalftoneSettings | null = null;
  private raf = 0;
  private disposed = false;
  private exportResolve:
    | ((result: ExportResult) => void)
    | null = null;
  private exportReject: ((err: Error) => void) | null = null;
  private exportTimer: ReturnType<typeof setTimeout> | null = null;

  onReady: ((api: GpuApi) => void) | null = null;
  onFrame: ((frame: FramePayload) => void) | null = null;
  onHistogram: ((bins: Uint32Array) => void) | null = null;
  onError: ((message: string) => void) | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../../workers/halftone.worker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker.onmessage = (e: MessageEvent<MainMessage>) => {
      const msg = e.data;
      // Un cliente desechado no debe entregar frames (evita que una carga
      // anterior reemplace el preview vigente). El bitmap se libera aquí.
      if (this.disposed) {
        if (msg.type === "frame") msg.bitmap.close();
        return;
      }
      switch (msg.type) {
        case "ready":
          this.onReady?.(msg.api);
          break;
        case "frame":
          this.onFrame?.({ bitmap: msg.bitmap, renderMs: msg.renderMs });
          break;
        case "histogram":
          this.onHistogram?.(new Uint32Array(msg.bins));
          break;
        case "export-done": {
          const result: ExportResult = {
            buffer: msg.buffer,
            width: msg.width,
            height: msg.height,
            mime: msg.mime,
            diagnostics: msg.diagnostics,
          };
          this.exportResolve?.(result);
          this.clearExport();
          break;
        }
        case "export-error": {
          this.failExport(msg.message);
          break;
        }
        case "error":
          this.onError?.(msg.message);
          break;
      }
    };
    this.worker.onerror = (e) => {
      const message = e.message || "Error desconocido en el worker.";
      // No dejar una exportación colgada si el worker muere.
      this.failExport(message);
      this.onError?.(message);
    };
  }

  private clearExport() {
    if (this.exportTimer) {
      clearTimeout(this.exportTimer);
      this.exportTimer = null;
    }
    this.exportResolve = null;
    this.exportReject = null;
  }

  private failExport(message: string) {
    const reject = this.exportReject;
    this.clearExport();
    reject?.(new Error(message));
  }

  init(
    bitmap: ImageBitmap,
    imageWidth: number,
    imageHeight: number,
    options: { preview?: boolean } = {}
  ) {
    if (this.disposed) {
      bitmap.close();
      return;
    }
    this.worker.postMessage(
      {
        type: "init",
        bitmap,
        imageWidth,
        imageHeight,
        preview: options.preview !== false,
      },
      [bitmap]
    );
  }

  update(settings: HalftoneSettings) {
    this.settings = settings;
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.disposed || !this.settings) return;
      this.worker.postMessage({ type: "settings", settings: this.settings });
    });
  }

  export(
    settings: HalftoneSettings,
    format: ExportFormat,
    scale: ExportScale
  ): Promise<ExportResult> {
    // Una exportación nueva cancela la anterior pendiente.
    this.failExport("Exportación reemplazada por una nueva solicitud.");
    return new Promise((resolve, reject) => {
      this.exportResolve = resolve;
      this.exportReject = reject;
      this.exportTimer = setTimeout(() => {
        this.failExport(
          "La exportación no respondió en 60 s (posible bloqueo de la GPU)."
        );
      }, 60_000);
      this.worker.postMessage({ type: "export", format, scale, settings });
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.failExport("Exportación cancelada: motor cerrado.");
    this.worker.postMessage({ type: "dispose" });
    this.worker.terminate();
  }
}

export class InlineHalftoneClient implements HalftoneClientLike {
  readonly kind = "inline" as const;
  private engine: HalftoneRenderer | null = null;
  private bitmap: ImageBitmap | null = null;
  private imageWidth = 0;
  private imageHeight = 0;
  private settings: HalftoneSettings | null = null;
  private raf = 0;
  private disposed = false;
  private renderSeq = 0;
  private readonly forceWebGL2: boolean;

  constructor(opts: { forceWebGL2?: boolean } = {}) {
    this.forceWebGL2 = opts.forceWebGL2 ?? false;
  }

  onReady: ((api: GpuApi) => void) | null = null;
  onFrame: ((frame: FramePayload) => void) | null = null;
  onHistogram: ((bins: Uint32Array) => void) | null = null;
  onError: ((message: string) => void) | null = null;

  init(
    bitmap: ImageBitmap,
    imageWidth: number,
    imageHeight: number,
    options: { preview?: boolean } = {}
  ) {
    if (this.disposed) {
      bitmap.close();
      return;
    }
    this.bitmap?.close();
    this.bitmap = bitmap;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    if (options.preview === false) return;
    void (async () => {
      try {
        const { width, height } = previewSize(imageWidth, imageHeight);
        this.engine?.dispose();
        const engine = await createBestRenderer(
          new OffscreenCanvas(width, height),
          (message) => this.onError?.(message),
          { forceWebGL2: this.forceWebGL2 }
        );
        if (this.disposed) {
          engine.dispose();
          return;
        }
        this.engine = engine;
        engine.setBitmap(bitmap);
        this.onReady?.(engine.kind);
        await this.render();
        this.computeHistogram(bitmap);
      } catch (err) {
        this.onError?.(err instanceof Error ? err.message : String(err));
      }
    })();
  }

  update(settings: HalftoneSettings) {
    if (this.disposed) return;
    this.settings = settings;
    if (this.raf || this.disposed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.disposed) return;
      void this.render();
    });
  }

  export(
    settings: HalftoneSettings,
    format: ExportFormat,
    scale: ExportScale
  ): Promise<ExportResult> {
    if (!this.bitmap) {
      return Promise.reject(new Error("No hay muestra cargada."));
    }
    const task = renderExport(
      this.bitmap,
      this.imageWidth,
      this.imageHeight,
      settings,
      format,
      scale
    );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "La exportación no respondió en 60 s (posible bloqueo de la GPU)."
            )
          ),
        60_000
      );
      task.then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  private async render() {
    if (!this.engine || !this.settings) return;
    const seq = ++this.renderSeq;
    try {
      const { width, height } = previewSize(this.imageWidth, this.imageHeight);
      const renderMs = await this.engine.render(
        this.settings,
        this.imageWidth,
        width,
        height
      );
      if (seq !== this.renderSeq || !this.engine || this.disposed) return;
      const out = this.engine.canvas.transferToImageBitmap();
      this.onFrame?.({ bitmap: out, renderMs });
    } catch (err) {
      // Un contexto GPU perdido no debe convertirse en una promesa
      // rechazada sin manejar: se comunica como error del motor.
      if (this.disposed) return;
      this.onError?.(err instanceof Error ? err.message : String(err));
    }
  }

  private computeHistogram(src: ImageBitmap) {
    const scale = Math.min(1, 512 / src.width);
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const c2 = new OffscreenCanvas(w, h);
    const ctx2d = c2.getContext("2d");
    if (!ctx2d) return;
    ctx2d.drawImage(src, 0, 0, w, h);
    const data = ctx2d.getImageData(0, 0, w, h).data;
    this.onHistogram?.(luminanceHistogram(data, w, h));
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.engine?.dispose();
    this.engine = null;
    this.bitmap?.close();
    this.bitmap = null;
  }
}

function supportsOffscreenGPU(): boolean {
  if (typeof OffscreenCanvas === "undefined") return false;
  try {
    const c = new OffscreenCanvas(2, 2);
    if (c.getContext("webgl2")) return true;
    // WebGPU se confirma en la fábrica de renderizadores (async).
    return typeof navigator !== "undefined" && "gpu" in navigator;
  } catch {
    return false;
  }
}

export function canUseWorkerEngine(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof ImageBitmap !== "undefined" &&
    supportsOffscreenGPU()
  );
}

/** Fábrica: elige worker si es posible; si no, fallback inline. */
export function createHalftoneClient(): HalftoneClientLike {
  if (canUseWorkerEngine()) return new HalftoneClient();
  if (supportsOffscreenGPU()) return new InlineHalftoneClient();
  throw new Error(
    "Este navegador no soporta WebGPU ni WebGL2 con OffscreenCanvas. " +
      "Usa una versión reciente de Chrome, Edge, Firefox o Safari."
  );
}
