import assert from "node:assert/strict";
import test from "node:test";

import { fileToBitmaps } from "@/lib/halftone/load-image";

type FakeBitmap = ImageBitmap & { closedCount: number };

type FakeFile = {
  type: string;
  name: string;
  width: number;
  height: number;
};

const originalCreateImageBitmap = globalThis.createImageBitmap;
let created: FakeBitmap[] = [];

function installDecodeStub() {
  created = [];
  (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap = async (
    source: FakeFile,
    options?: { resizeWidth?: number; resizeHeight?: number }
  ): Promise<FakeBitmap> => {
    const bitmap = {
      width: options?.resizeWidth ?? source.width,
      height: options?.resizeHeight ?? source.height,
      closedCount: 0,
      close() {
        this.closedCount += 1;
      },
    } as FakeBitmap;
    created.push(bitmap);
    return bitmap;
  };
}

function restoreDecode() {
  (globalThis as unknown as { createImageBitmap: unknown }).createImageBitmap =
    originalCreateImageBitmap;
}

function fakeFile(type: string, width: number, height: number): File {
  return { type, name: `muestra.${type.split("/")[1]}`, width, height } as unknown as File;
}

test("acepta PNG, JPEG y WebP y devuelve dimensiones correctas", async () => {
  installDecodeStub();
  try {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      const loaded = await fileToBitmaps(fakeFile(type, 320, 180));
      assert.equal(loaded.width, 320);
      assert.equal(loaded.height, 180);
      assert.equal(loaded.resized, false);
      assert.equal(loaded.bitmap.width, 320);
    }
  } finally {
    restoreDecode();
  }
});

test("rechaza formatos no soportados con un mensaje claro", async () => {
  installDecodeStub();
  try {
    await assert.rejects(
      () => fileToBitmaps(fakeFile("image/heic", 100, 100)),
      /Formato no soportado: image\/heic/
    );
    assert.equal(created.length, 0, "no debe decodificar un MIME inválido");
  } finally {
    restoreDecode();
  }
});

test("redimensiona al límite de 4096 px conservando la proporción", async () => {
  installDecodeStub();
  try {
    const loaded = await fileToBitmaps(fakeFile("image/png", 8000, 4000));
    assert.equal(loaded.resized, true);
    assert.equal(loaded.width, 4096);
    assert.equal(loaded.height, 2048);
    assert.ok(Math.abs(loaded.width / loaded.height - 2) < 0.01);
  } finally {
    restoreDecode();
  }
});

test("libera el sondeo de dimensiones exactamente una vez", async () => {
  installDecodeStub();
  try {
    await fileToBitmaps(fakeFile("image/png", 640, 480));
    assert.equal(created.length, 2, "probe + bitmap del motor");
    assert.equal(created[0].closedCount, 1, "el probe se cierra");
    assert.equal(created[1].closedCount, 0, "el bitmap del motor se transfiere");
  } finally {
    restoreDecode();
  }
});
