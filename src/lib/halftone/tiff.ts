/* ------------------------------------------------------------------ */
/* Escritor de TIFF bilevel (1-bit) con compresión PackBits.           */
/*                                                                     */
/* Salida clásica de film de serigrafía/DTF:                          */
/*  - PhotometricInterpretation = 0 (WhiteIsZero)                      */
/*  - bit 0 = tinta presente (se ve negro sobre blanco)                */
/*  - una tira por fila, comprimida con PackBits                       */
/*                                                                     */
/* Layout: [header][IFD][array StripOffsets][array StripByteCounts]   */
/*         [racionales de resolución][datos de tiras]                  */
/*                                                                     */
/* Puro TypeScript — testeable en Node sin DOM.                        */
/* ------------------------------------------------------------------ */

export const TIFF_COMPRESSION_PACKBITS = 32773;

function packBitsRow(row: Uint8Array): Uint8Array {
  // Máximo teórico: peor caso literales = n + n/128 bytes de cabecera.
  const out: number[] = [];
  let i = 0;
  const n = row.length;

  while (i < n) {
    let run = 1;
    while (i + run < n && row[i + run] === row[i] && run < 128) run++;
    if (run >= 2) {
      // Repetición: byte de control (1 - run) + byte repetido.
      out.push(1 - run, row[i]);
      i += run;
    } else {
      // Literales: contar hasta 128 o hasta el inicio de una repetición.
      let lit = 1;
      while (
        i + lit < n &&
        lit < 128 &&
        !(row[i + lit] === row[i + lit - 1] && (lit + 1 < n ? row[i + lit + 1] === row[i + lit] : false))
      ) {
        lit++;
      }
      out.push(lit - 1);
      for (let k = 0; k < lit; k++) out.push(row[i + k]);
      i += lit;
    }
  }

  return new Uint8Array(out);
}

/**
 * Codifica una imagen 1-bit a TIFF (endianness little, PackBits).
 * @param packedRows bytes empaquetados: fila `r` ocupa
 *        [r*stride, (r+1)*stride); el bit más significativo es el primer
 *        píxel de la fila (convención TIFF) y 1 significa tinta.
 * @param width  ancho en píxeles
 * @param height alto en píxeles
 */
export function encodeTiff1Bit(
  packedRows: Uint8Array,
  width: number,
  height: number,
  dpi = 300
): Uint8Array {
  const stride = Math.ceil(width / 8);
  const ifdEntries = 12;
  const headerSize = 8;
  const ifdSize = 2 + ifdEntries * 12 + 4;
  const offsetsArrayPos = headerSize + ifdSize;
  const countsArrayPos = offsetsArrayPos + height * 4;
  const rationalsPos = countsArrayPos + height * 4;
  const stripDataStart = rationalsPos + 16;

  // Comprimir tiras y calcular sus offsets.
  const strips: Uint8Array[] = [];
  const stripOffsets: number[] = [];
  const stripByteCounts: number[] = [];
  let offset = stripDataStart;
  for (let r = 0; r < height; r++) {
    const packed = packBitsRow(packedRows.subarray(r * stride, (r + 1) * stride));
    strips.push(packed);
    stripOffsets.push(offset);
    stripByteCounts.push(packed.length);
    offset += packed.length;
  }

  const total = offset;
  const buf = new Uint8Array(total);
  const view = new DataView(buf.buffer);
  const encoder = new TextEncoder();

  // Header (little endian)
  encoder.encodeInto("II", new Uint8Array(buf.buffer, 0, 2));
  view.setUint16(2, 42, true);
  view.setUint32(4, headerSize, true);

  // IFD
  view.setUint16(headerSize, ifdEntries, true);
  let e = headerSize + 2;
  const entry = (
    tag: number,
    type: number,
    count: number,
    value: number
  ) => {
    view.setUint16(e, tag, true);
    view.setUint16(e + 2, type, true);
    view.setUint32(e + 4, count, true);
    // SHORT cabe en el campo de 4 bytes; LONG ocupa el campo completo.
    if (type === 3) view.setUint16(e + 8, value, true);
    else view.setUint32(e + 8, value, true);
    e += 12;
  };

  entry(256, 4, 1, width); // ImageWidth (LONG)
  entry(257, 4, 1, height); // ImageLength (LONG)
  entry(258, 3, 1, 1); // BitsPerSample = 1
  entry(259, 3, 1, TIFF_COMPRESSION_PACKBITS); // Compression
  entry(262, 3, 1, 0); // PhotometricInterpretation = WhiteIsZero
  entry(273, 4, height, offsetsArrayPos); // StripOffsets (array)
  entry(277, 3, 1, 1); // SamplesPerPixel
  // Cada tira contiene UNA fila; debe coincidir con el número de tiras.
  entry(278, 4, 1, 1); // RowsPerStrip
  entry(279, 4, height, countsArrayPos); // StripByteCounts (array)
  entry(282, 5, 1, rationalsPos); // XResolution (RATIONAL)
  entry(283, 5, 1, rationalsPos + 8); // YResolution
  entry(296, 3, 1, 2); // ResolutionUnit = inch
  view.setUint32(e, 0, true); // next IFD = 0

  // Arrays de offsets y contadores de tira.
  for (let r = 0; r < height; r++) {
    view.setUint32(offsetsArrayPos + r * 4, stripOffsets[r], true);
    view.setUint32(countsArrayPos + r * 4, stripByteCounts[r], true);
  }

  // Resolución racional: dpi/1 dos veces.
  view.setUint32(rationalsPos, dpi, true);
  view.setUint32(rationalsPos + 4, 1, true);
  view.setUint32(rationalsPos + 8, dpi, true);
  view.setUint32(rationalsPos + 12, 1, true);

  // Datos de tiras.
  let p = stripDataStart;
  for (const packed of strips) {
    buf.set(packed, p);
    p += packed.length;
  }

  return buf;
}
