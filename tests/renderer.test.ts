import assert from "node:assert/strict";
import test from "node:test";

import {
  createBestRenderer,
  createWebGL2Renderer,
} from "@/lib/halftone/renderer";

type FakeCanvas = OffscreenCanvas & {
  getContext: (type: string) => null;
};

function fakeCanvas(): FakeCanvas {
  return {
    getContext: () => null,
  } as unknown as FakeCanvas;
}

const nav = globalThis.navigator as unknown as Record<string, unknown>;
const hadGpu = "gpu" in nav;
const originalGpu = nav.gpu;

function setGpu(value: unknown) {
  Object.defineProperty(nav, "gpu", {
    value,
    configurable: true,
    writable: true,
  });
}

function restoreGpu() {
  if (hadGpu) {
    setGpu(originalGpu);
  } else {
    delete nav.gpu;
  }
}

test("createWebGL2Renderer falla visiblemente si WebGL2 no está disponible", () => {
  assert.throws(
    () => createWebGL2Renderer(fakeCanvas()),
    /WebGL2 no disponible/
  );
});

test("sin navigator.gpu cae a WebGL2 y reporta el fallo", async () => {
  if ("gpu" in nav) delete nav.gpu;
  try {
    await assert.rejects(
      () => createBestRenderer(fakeCanvas()),
      /WebGL2 no disponible/
    );
  } finally {
    restoreGpu();
  }
});

test("adaptador WebGPU nulo → WebGL2", async () => {
  setGpu({ requestAdapter: async () => null });
  try {
    await assert.rejects(
      () => createBestRenderer(fakeCanvas()),
      /WebGL2 no disponible/
    );
  } finally {
    restoreGpu();
  }
});

test("fallo al pedir el dispositivo → onError y WebGL2", async () => {
  setGpu({
    requestAdapter: async () => ({
      requestDevice: async () => {
        throw new Error("device perdido");
      },
    }),
  });
  const messages: string[] = [];
  try {
    await assert.rejects(
      () =>
        createBestRenderer(fakeCanvas(), (message) => messages.push(message)),
      /WebGL2 no disponible/
    );
    assert.equal(messages.length, 1);
    assert.match(messages[0], /WebGPU no disponible/);
    assert.match(messages[0], /device perdido/);
  } finally {
    restoreGpu();
  }
});

test("adaptador colgado → timeout, onError y WebGL2", async () => {
  setGpu({ requestAdapter: () => new Promise(() => {}) });
  const messages: string[] = [];
  const start = Date.now();
  try {
    await assert.rejects(
      () =>
        createBestRenderer(fakeCanvas(), (message) => messages.push(message)),
      /WebGL2 no disponible/
    );
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 1700, `debe esperar el timeout (fue ${elapsed} ms)`);
    assert.match(messages[0] ?? "", /sin respuesta/);
  } finally {
    restoreGpu();
  }
});

test("forceWebGL2 no toca navigator.gpu", async () => {
  let adapterCalls = 0;
  setGpu({
    requestAdapter: async () => {
      adapterCalls += 1;
      return null;
    },
  });
  try {
    await assert.rejects(
      () => createBestRenderer(fakeCanvas(), undefined, { forceWebGL2: true }),
      /WebGL2 no disponible/
    );
    assert.equal(adapterCalls, 0);
  } finally {
    restoreGpu();
  }
});
