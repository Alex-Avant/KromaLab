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
  init(bitmap: ImageBitmap, imageWidth: number, imageHeight: number): void;
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
          };
          this.exportResolve?.(result);
          this.exportResolve = null;
          this.exportReject = null;
          break;
        }
        case "export-error": {
          this.exportReject?.(new Error(msg.message));
          this.exportResolve = null;
          this.exportReject = null;
          break;
        }
        case "error":
          this.onError?.(msg.message);
          break;
      }
    };
    this.worker.onerror = (e) => {
      this.onError?.(e.message || "Error desconocido en el worker.");
    };
  }

  init(bitmap: ImageBitmap, imageWidth: number, imageHeight: number) {
    this.worker.postMessage(
      { type: "init", bitmap, imageWidth, imageHeight },
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
    return new Promise((resolve, reject) => {
      this.exportResolve = resolve;
      this.exportReject = reject;
      this.worker.postMessage({ type: "export", format, scale, settings });
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
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

  onReady: ((api: GpuApi) => void) | null = null;
  onFrame: ((frame: FramePayload) => void) | null = null;
  onHistogram: ((bins: Uint32Array) => void) | null = null;
  onError: ((message: string) => void) | null = null;

  init(bitmap: ImageBitmap, imageWidth: number, imageHeight: number) {
    this.bitmap?.close();
    this.bitmap = bitmap;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    void (async () => {
      try {
        const { width, height } = previewSize(imageWidth, imageHeight);
        this.engine?.dispose();
        const engine = await createBestRenderer(
          new OffscreenCanvas(width, height)
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
    return renderExport(
      this.bitmap,
      this.imageWidth,
      this.imageHeight,
      settings,
      format,
      scale
    );
  }

  private async render() {
    if (!this.engine || !this.settings) return;
    const seq = ++this.renderSeq;
    const { width, height } = previewSize(this.imageWidth, this.imageHeight);
    const renderMs = await this.engine.render(
      this.settings,
      this.imageWidth,
      width,
      height
    );
    if (seq !== this.renderSeq || !this.engine) return;
    const out = this.engine.canvas.transferToImageBitmap();
    this.onFrame?.({ bitmap: out, renderMs });
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
