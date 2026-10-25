import assert from "node:assert/strict";
import test from "node:test";

import { HalftoneClient } from "@/lib/halftone/worker-client";
import { DEFAULT_SETTINGS } from "@/lib/halftone/types";

type FakeBitmap = ImageBitmap & { closedCount: number };

function fakeBitmap(): FakeBitmap {
  const bitmap = {
    width: 64,
    height: 64,
    closedCount: 0,
    close() {
      bitmap.closedCount += 1;
    },
  };
  return bitmap as unknown as FakeBitmap;
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: unknown[] = [];
  transfers: unknown[][] = [];
  terminated = false;

  readonly url: URL;
  readonly options: unknown;

  constructor(url: URL, options: unknown) {
    this.url = url;
    this.options = options;
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown, transfer?: unknown[]) {
    this.posted.push(message);
    this.transfers.push(transfer ?? []);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: unknown) {
    this.onmessage?.({ data: message });
  }
}

const originalWorker = (globalThis as { Worker?: unknown }).Worker;
const originalRaf = globalThis.requestAnimationFrame;
const originalCancel = globalThis.cancelAnimationFrame;

(globalThis as { Worker?: unknown }).Worker = FakeWorker;
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
  setTimeout(() => callback(performance.now()), 0) as unknown as number;
globalThis.cancelAnimationFrame = (handle: number) =>
  clearTimeout(handle as unknown as NodeJS.Timeout);

function lastWorker(): FakeWorker {
  const worker = FakeWorker.instances.at(-1);
  assert.ok(worker, "el worker debe existir");
  return worker;
}

test.after(() => {
  (globalThis as { Worker?: unknown }).Worker = originalWorker;
  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancel;
});

test("init transfiere el bitmap y publica los ajustes una sola vez", async () => {
  const client = new HalftoneClient();
  const worker = lastWorker();
  const bitmap = fakeBitmap();

  client.init(bitmap, 100, 80);
  const init = worker.posted[0] as {
    type: string;
    bitmap: ImageBitmap;
    imageWidth: number;
    imageHeight: number;
  };
  assert.equal(init.type, "init");
  assert.equal(init.bitmap, bitmap);
  assert.equal(init.imageWidth, 100);
  assert.equal(worker.transfers[0]?.[0], bitmap, "transferencia sin copia");

  client.update({ ...DEFAULT_SETTINGS, lpi: 40 });
  client.update({ ...DEFAULT_SETTINGS, lpi: 50 });
  client.update({ ...DEFAULT_SETTINGS, lpi: 60 });
  await new Promise((resolve) => setTimeout(resolve, 25));

  const settingsMessages = worker.posted.filter(
    (message) => (message as { type: string }).type === "settings"
  ) as { settings: { lpi: number } }[];
  assert.equal(settingsMessages.length, 1, "coalescing por rAF");
  assert.equal(settingsMessages[0].settings.lpi, 60, "gana el último ajuste");
});

test("ready, frame, histograma y error llegan a los callbacks", () => {
  const client = new HalftoneClient();
  const worker = lastWorker();
  const seen = {
    api: null as string | null,
    frame: null as ImageBitmap | null,
    bins: null as Uint32Array | null,
    error: null as string | null,
  };

  client.onReady = (value) => (seen.api = value);
  client.onFrame = (payload) => (seen.frame = payload.bitmap);
  client.onHistogram = (value) => (seen.bins = value);
  client.onError = (message) => (seen.error = message);

  worker.emit({ type: "ready", api: "webgl2" });
  worker.emit({ type: "frame", bitmap: fakeBitmap(), renderMs: 3 });
  worker.emit({ type: "histogram", bins: new ArrayBuffer(256 * 4) });
  worker.emit({ type: "error", message: "shader roto" });

  assert.equal(seen.api, "webgl2");
  assert.ok(seen.frame);
  assert.ok(seen.bins);
  assert.equal(seen.bins.length, 256);
  assert.equal(seen.error, "shader roto");
});

test("tras dispose: termina el worker, ignora frames y los libera una vez", () => {
  const client = new HalftoneClient();
  const worker = lastWorker();
  let frames = 0;
  client.onFrame = () => {
    frames += 1;
  };

  client.dispose();
  assert.equal(worker.terminated, true);

  const stale = fakeBitmap();
  worker.emit({ type: "frame", bitmap: stale, renderMs: 1 });

  assert.equal(frames, 0, "un frame tardío no reemplaza el preview");
  assert.equal(stale.closedCount, 1, "se libera exactamente una vez");
});

test("init/update después de dispose no publican ni filtran bitmaps", () => {
  const client = new HalftoneClient();
  const worker = lastWorker();
  client.dispose();
  const before = worker.posted.length;

  const late = fakeBitmap();
  client.init(late, 10, 10);
  client.update(DEFAULT_SETTINGS);

  assert.equal(late.closedCount, 1);
  assert.equal(worker.posted.length, before, "no se envían mensajes");
});

test("la exportación entrega el diagnóstico del worker", async () => {
  const client = new HalftoneClient();
  const worker = lastWorker();
  const pending = client.export(DEFAULT_SETTINGS, "tiff", 2);
  const message = worker.posted.at(-1) as { type: string; scale: number };
  assert.equal(message.type, "export");
  assert.equal(message.scale, 2);

  const buffer = new ArrayBuffer(4);
  const diagnostics = {
    width: 10,
    height: 5,
    dpi: 600,
    mime: "image/tiff",
    tiles: 1,
    alpha: false,
    totalPixels: 50,
    transparentPixels: 45,
    inkPixels: 5,
    alphaStdDev: 0.2,
  };
  worker.emit({
    type: "export-done",
    buffer,
    width: 10,
    height: 5,
    mime: "image/tiff",
    diagnostics,
  });

  const result = await pending;
  assert.equal(result.buffer, buffer);
  assert.deepEqual(result.diagnostics, diagnostics);
});

test("frames de una carga anterior se descartan al crear un cliente nuevo", () => {
  const oldClient = new HalftoneClient();
  const oldWorker = lastWorker();
  let oldFrames = 0;
  oldClient.onFrame = () => {
    oldFrames += 1;
  };
  oldClient.dispose();

  const newClient = new HalftoneClient();
  const newWorker = lastWorker();
  let newFrames = 0;
  newClient.onFrame = () => {
    newFrames += 1;
  };

  const stale = fakeBitmap();
  oldWorker.emit({ type: "frame", bitmap: stale, renderMs: 1 });
  newWorker.emit({ type: "frame", bitmap: fakeBitmap(), renderMs: 2 });

  assert.equal(oldFrames, 0);
  assert.equal(stale.closedCount, 1);
  assert.equal(newFrames, 1, "el cliente vigente sí recibe su frame");
});
