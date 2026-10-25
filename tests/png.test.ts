import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";

import { encodePngRgba } from "@/lib/halftone/png";

function chunks(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const result: { type: string; data: Uint8Array }[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      png[offset + 4],
      png[offset + 5],
      png[offset + 6],
      png[offset + 7]
    );
    result.push({
      type,
      data: png.subarray(offset + 8, offset + 8 + length),
    });
    offset += 12 + length;
  }
  return result;
}

test("PNG RGBA: firma, IHDR, IDAT y píxeles con alfa", async () => {
  const width = 3;
  const height = 2;
  const rows = [
    [255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0],
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120],
  ];

  const png = await encodePngRgba(width, height, (y) =>
    Uint8Array.from(rows[y])
  );

  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((value, index) => assert.equal(png[index], value));

  const parts = chunks(png);
  assert.equal(parts[0].type, "IHDR");
  assert.equal(parts.at(-1)?.type, "IEND");

  const ihdr = new DataView(
    parts[0].data.buffer,
    parts[0].data.byteOffset,
    parts[0].data.byteLength
  );
  assert.equal(ihdr.getUint32(0), width);
  assert.equal(ihdr.getUint32(4), height);
  assert.equal(parts[0].data[8], 8, "bit depth");
  assert.equal(parts[0].data[9], 6, "color type RGBA");

  const idat = Buffer.concat(
    parts.filter((part) => part.type === "IDAT").map((part) => Buffer.from(part.data))
  );
  const raw = zlib.inflateSync(idat);
  const stride = 1 + width * 4;
  assert.equal(raw.length, stride * height);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * stride], 0, "filtro None");
    assert.deepEqual(
      Array.from(raw.subarray(y * stride + 1, (y + 1) * stride)),
      rows[y],
      `fila ${y}`
    );
  }
});

test("PNG rechaza dimensiones inválidas", async () => {
  await assert.rejects(() => encodePngRgba(0, 10, () => new Uint8Array(0)));
});
