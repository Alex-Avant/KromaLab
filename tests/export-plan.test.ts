import assert from "node:assert/strict";
import test from "node:test";

import {
  countInkRow,
  exportOutputSize,
  packInkRowFromRgba,
  planTiles,
  transparentExportSettings,
} from "@/lib/halftone/export-plan";
import { DEFAULT_SETTINGS } from "@/lib/halftone/types";

test("la escala multiplica la resolución y el DPI efectivo", () => {
  assert.deepEqual(exportOutputSize(512, 300, 1), {
    width: 512,
    height: 300,
    dpi: 300,
  });
  assert.deepEqual(exportOutputSize(512, 300, 2), {
    width: 1024,
    height: 600,
    dpi: 600,
  });
  assert.deepEqual(exportOutputSize(512, 300, 4), {
    width: 2048,
    height: 1200,
    dpi: 1200,
  });
});

test("los tiles cubren el lienzo completo sin huecos ni solapes", () => {
  for (const [width, height] of [
    [512, 512],
    [4096, 3000],
    [5000, 100],
    [100, 5000],
    [1, 1],
  ]) {
    const { tile: tileSize, tiles } = planTiles(width, height, 2048);
    assert.ok(tileSize <= 2048 && tileSize >= 1);
    const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
    assert.equal(area, width * height, `área ${width}×${height}`);

    for (const tile of tiles) {
      assert.ok(tile.x >= 0 && tile.y >= 0);
      assert.ok(tile.x + tile.w <= width);
      assert.ok(tile.y + tile.h <= height);
      assert.ok(tile.w > 0 && tile.h > 0);
      assert.equal(tile.glOriginY, height - tile.y - tile.h);
    }

    // Sin solapes: una rejilla de ocupación por píxel no es viable en
    // tamaños grandes; se comprueba por coordenadas únicas de tile.
    const seen = new Set(tiles.map((t) => `${t.x},${t.y}`));
    assert.equal(seen.size, tiles.length);
  }
});

test("el lienzo del motor es fijo y el recorte usa su altura", () => {
  const { tile, canvas, tiles } = planTiles(300, 200);
  assert.equal(tile, 200, "paso de la rejilla");
  assert.equal(canvas, 2048, "lienzo reutilizable");
  assert.equal(tiles.length, 2, "300×200 → tiles de 200 y 100");
  assert.equal(tiles[0].cropY, 2048 - 200);
  assert.equal(tiles[0].glOriginY, 0);
});

test("el recorte del bitmap del tile respeta el viewport GL", () => {
  const { tiles } = planTiles(1000, 900, 512);
  const lastRow = tiles.filter((t) => t.y === 512);
  assert.ok(lastRow.length > 0);
  for (const tile of lastRow) {
    assert.equal(tile.h, 388);
    assert.equal(tile.cropY, 512 - 388);
  }
});

test("la exportación fuerza fondo transparente sin tocar el resto", () => {
  const settings = { ...DEFAULT_SETTINGS, bg: "black" as const };
  const result = transparentExportSettings(settings);
  assert.equal(result.bg, "transparent");
  assert.deepEqual(
    { ...result, bg: "black" },
    settings,
    "el resto de parámetros se conserva"
  );
});

test("el empaquetado 1-bit marca tinta donde el alfa es visible", () => {
  // 10 px: tinta en 0,1 y 9; transparente en 2..8.
  const alphas = [255, 200, 0, 1, 127, 128, 0, 0, 0, 255];
  const rgba = new Uint8ClampedArray(alphas.length * 4);
  alphas.forEach((alpha, index) => {
    rgba[index * 4 + 3] = alpha;
  });

  const row = packInkRowFromRgba(rgba, alphas.length);
  assert.equal(row.length, 2);
  // MSB-first: px0,px1 = tinta; px5 (alfa 128) = tinta; px9 = tinta.
  assert.equal(row[0], 0b11000100);
  assert.equal(row[1], 0b01000000);
  assert.equal(countInkRow(rgba, alphas.length), 4);
});

test("ancho no múltiplo de 8 no desborda la fila", () => {
  const rgba = new Uint8ClampedArray(13 * 4);
  for (let x = 0; x < 13; x++) rgba[x * 4 + 3] = 255;
  const row = packInkRowFromRgba(rgba, 13);
  assert.equal(row.length, 2);
  assert.equal(row[0], 0xff);
  assert.equal(row[1], 0b11111000);
});
