/* ------------------------------------------------------------------ */
/* Worker del motor de semitonos.                                      */
/*                                                                     */
/* El worker posee el renderizador de GPU (WebGPU con fallback a       */
/* WebGL2) sobre OffscreenCanvas: el hilo principal nunca bloquea      */
/* durante el render. Los mensajes de ajustes se encolan de forma      */
/* natural mientras el render anterior se completa (coalescing):       */
/* arrastrar el slider produce un render por mensaje procesado.        */
/*                                                                     */
/* Exportación: render por tiles (TILE_SIZE) compuestos en un lienzo   */
/* 2D de resolución completa (export-render.ts).                       */
/*                                                                     */
/* Carga perezosa: este worker solo se instancia tras la primera       */
/* interacción del usuario (soltar/pegar una imagen).                  */
/* ------------------------------------------------------------------ */

/// <reference lib="webworker" />

import { luminanceHistogram } from "@/lib/halftone/histogram";
import { renderExport } from "@/lib/halftone/export-render";
import { createBestRenderer, type HalftoneRenderer } from "@/lib/halftone/renderer";
import {
  type HalftoneSettings,
  previewSize,
} from "@/lib/halftone/types";
import type {
  WorkerMessage,
  WorkerExportMsg,
  MainMessage,
} from "@/lib/halftone/protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let engine: HalftoneRenderer | null = null;
let bitmap: ImageBitmap | null = null;
let imageWidth = 0;
let imageHeight = 0;
let settings: HalftoneSettings | null = null;
let renderSeq = 0;

function post(msg: MainMessage, transfer: Transferable[] = []) {
  ctx.postMessage(msg, transfer);
}

async function renderPreview() {
  if (!engine || !settings) return;
  const seq = ++renderSeq;
  try {
    const { width, height } = previewSize(imageWidth, imageHeight);
    const renderMs = await engine.render(settings, imageWidth, width, height);
    // Descarta frames obsoletos si llegó un ajuste nuevo mientras tanto.
    if (seq !== renderSeq || !engine) return;
    const out = engine.canvas.transferToImageBitmap();
    post({ type: "frame", bitmap: out, renderMs }, [out]);
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Histograma de la imagen original, muestreado a ≤512 px (worker). */
function computeHistogram(src: ImageBitmap) {
  const scale = Math.min(1, 512 / src.width);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c2 = new OffscreenCanvas(w, h);
  const ctx2d = c2.getContext("2d");
  if (!ctx2d) return;
  ctx2d.drawImage(src, 0, 0, w, h);
  const data = ctx2d.getImageData(0, 0, w, h).data;
  const bins = luminanceHistogram(data, w, h);
  post({ type: "histogram", bins: bins.buffer as ArrayBuffer }, [
    bins.buffer as ArrayBuffer,
  ]);
}

async function initEngine(incoming: ImageBitmap) {
  const { width, height } = previewSize(imageWidth, imageHeight);
  engine?.dispose();
  engine = null;
  const created = await createBestRenderer(
    new OffscreenCanvas(width, height),
    (message) => post({ type: "error", message })
  );
  // Otra carga pudo llegar mientras tanto: descartar esta instancia.
  if (bitmap !== incoming) {
    created.dispose();
    return;
  }
  engine = created;
  engine.setBitmap(incoming);
  post({ type: "ready", api: engine.kind });
  void renderPreview();
  computeHistogram(incoming);
}

function exportImage(msg: WorkerExportMsg) {
  if (!bitmap || !settings) {
    post({ type: "export-error", message: "No hay muestra cargada." });
    return;
  }
  void renderExport(
    bitmap,
    imageWidth,
    imageHeight,
    msg.settings,
    msg.format,
    msg.scale
  )
    .then((result) => {
      post({ type: "export-done", ...result }, [result.buffer]);
    })
    .catch((err: unknown) => {
      post({
        type: "export-error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
}

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      bitmap?.close();
      bitmap = msg.bitmap;
      imageWidth = msg.imageWidth;
      imageHeight = msg.imageHeight;
      if (msg.preview === false) {
        // Solo exportación: no se crea contexto de preview.
        break;
      }
      void initEngine(bitmap).catch((err: unknown) => {
        post({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
      break;
    }
    case "settings": {
      // Se guardan siempre: el motor puede estar inicializándose (async).
      settings = msg.settings;
      if (engine) void renderPreview();
      break;
    }
    case "export": {
      exportImage(msg);
      break;
    }
    case "dispose": {
      renderSeq++;
      engine?.dispose();
      engine = null;
      bitmap?.close();
      bitmap = null;
      settings = null;
      break;
    }
  }
};

export {};
