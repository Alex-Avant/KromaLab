import assert from "node:assert/strict";
import test from "node:test";

import { encodeTiff1Bit } from "@/lib/halftone/tiff";

type Entry = { type: number; count: number; value: number };

function readIfd(tiff: Uint8Array) {
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  assert.equal(String.fromCharCode(tiff[0], tiff[1]), "II", "firma little endian");
  assert.equal(view.getUint16(2, true), 42, "magic TIFF");

  const ifd = view.getUint32(4, true);
  const count = view.getUint16(ifd, true);
  const entries = new Map<number, Entry>();
  for (let i = 0; i < count; i++) {
    const at = ifd + 2 + i * 12;
    entries.set(view.getUint16(at, true), {
      type: view.getUint16(at + 2, true),
      count: view.getUint32(at + 4, true),
      value: view.getUint32(at + 8, true),
    });
  }
  return { view, entries };
}

/** Decodificador PackBits mínimo para validar las tiras. */
function unpackBits(data: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let input = 0;
  let output = 0;
  while (input < data.length && output < length) {
    const control = (data[input++] << 24) >> 24; // signed byte
    if (control >= 0) {
      const count = control + 1;
      for (let i = 0; i < count && output < length; i++) {
        out[output++] = data[input++];
      }
    } else if (control !== -128) {
      const count = 1 - control;
      const byte = data[input++];
      for (let i = 0; i < count && output < length; i++) {
        out[output++] = byte;
      }
    }
  }
  return out;
}

test("TIFF 1-bit: etiquetas coherentes y una tira por fila", () => {
  const width = 13;
  const height = 3;
  const stride = Math.ceil(width / 8);
  const rows = new Uint8Array(stride * height);
  rows[0] = 0b11111111;
  rows[1] = 0b11111000;
  rows[stride] = 0b10000000;
  rows[stride * 2] = 0b00000001;

  const tiff = encodeTiff1Bit(rows, width, height, 600);
  const { view, entries } = readIfd(tiff);

  assert.equal(entries.get(256)?.value, width, "ImageWidth");
  assert.equal(entries.get(257)?.value, height, "ImageLength");
  assert.equal(entries.get(258)?.value, 1, "BitsPerSample");
  assert.equal(entries.get(259)?.value, 32773, "PackBits");
  assert.equal(entries.get(262)?.value, 0, "WhiteIsZero");
  assert.equal(entries.get(277)?.value, 1, "SamplesPerPixel");
  assert.equal(entries.get(278)?.value, 1, "RowsPerStrip debe ser 1");
  assert.equal(entries.get(296)?.value, 2, "resolución en pulgadas");

  const offsetCount = entries.get(273);
  const byteCount = entries.get(279);
  assert.ok(offsetCount && byteCount);
  assert.equal(offsetCount.count, height, "un offset por fila");
  assert.equal(byteCount.count, height, "un contador por fila");
  assert.equal(
    Math.ceil(height / (entries.get(278)?.value ?? 1)),
    offsetCount.count,
    "el lector espera exactamente las tiras escritas"
  );

  // Resolución: 600/1
  const xRes = entries.get(282);
  assert.ok(xRes);
  assert.equal(view.getUint32(xRes.value, true), 600);
  assert.equal(view.getUint32(xRes.value + 4, true), 1);

  // Cada tira decodifica exactamente su fila original.
  for (let r = 0; r < height; r++) {
    const start = view.getUint32(offsetCount.value + r * 4, true);
    const size = view.getUint32(byteCount.value + r * 4, true);
    const decoded = unpackBits(tiff.subarray(start, start + size), stride);
    assert.deepEqual(
      Array.from(decoded),
      Array.from(rows.subarray(r * stride, (r + 1) * stride)),
      `fila ${r}`
    );
  }
});

test("TIFF 1-bit: imagen de una sola fila y ancho múltiplo de 8", () => {
  const rows = new Uint8Array([0b10101010]);
  const tiff = encodeTiff1Bit(rows, 8, 1, 300);
  const { entries, view } = readIfd(tiff);
  assert.equal(entries.get(256)?.value, 8);
  assert.equal(entries.get(257)?.value, 1);
  assert.equal(entries.get(278)?.value, 1);

  const offsets = entries.get(273);
  const counts = entries.get(279);
  assert.ok(offsets && counts);
  assert.equal(offsets.count, 1);
  const start = view.getUint32(offsets.value, true);
  const size = view.getUint32(counts.value, true);
  assert.deepEqual(Array.from(unpackBits(tiff.subarray(start, start + size), 1)), [
    0b10101010,
  ]);
});
