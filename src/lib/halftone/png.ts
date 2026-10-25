/* ------------------------------------------------------------------ */
/* Codificador PNG RGBA (8-bit, color type 6).                         */
/*                                                                     */
/* Evita `OffscreenCanvas.convertToBlob` (puede bloquearse con         */
/* drivers/entornos concretos) y permite componer el PNG fila a fila,  */
/* sin duplicar el lienzo completo en memoria.                         */
/*                                                                     */
/* Puro TypeScript + CompressionStream: testeable en Node.             */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Codifica una imagen RGBA (8 bits por canal, alfa no premultiplicado).
 * `getRow(y)` debe devolver `width * 4` bytes RGBA de la fila `y`.
 */
export async function encodePngRgba(
  width: number,
  height: number,
  getRow: (y: number) => Uint8Array | Uint8ClampedArray
): Promise<Uint8Array> {
  if (width <= 0 || height <= 0) {
    throw new Error("Dimensiones de PNG inválidas.");
  }

  const compressor = new CompressionStream("deflate");
  const writer = compressor.writable.getWriter();
  const reader = compressor.readable.getReader();
  const idatParts: Uint8Array[] = [];
  const pump = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      idatParts.push(value);
    }
  })();

  for (let y = 0; y < height; y++) {
    const source = getRow(y);
    const row = new Uint8Array(1 + width * 4);
    row[0] = 0; // filtro None
    row.set(source.subarray(0, width * 4), 1);
    await writer.write(row);
  }
  await writer.close();
  await pump;

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sin entrelazado

  return concat([
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk("IHDR", ihdr),
    ...idatParts.map((part) => chunk("IDAT", part)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
