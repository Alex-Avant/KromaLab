import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SETTINGS,
  DOT_RADIUS_SCALE,
  cellCountAcross,
  cellSizePx,
  fitWithin,
  physicalSizeCm,
  previewDpi,
  previewSize,
  snapAngle,
} from "@/lib/halftone/types";
import { FRAGMENT_SOURCE } from "@/lib/halftone/glsl";
import { HALFTONE_COMPUTE_WGSL } from "@/lib/halftone/wgsl";

test("matemática de trama: célula, DPI de preview y células por ancho", () => {
  assert.equal(cellSizePx(55, 300), 300 / 55);
  assert.equal(previewDpi(800, 400), 150);
  // 400 px de preview a 150 DPI con 50 LPI → 3 px/célula → 133 células.
  assert.equal(cellCountAcross(800, 400, 50), Math.round(400 / 3));
});

test("previewSize limita el lado mayor a 1600 px sin deformar", () => {
  assert.deepEqual(previewSize(800, 600), { width: 800, height: 600 });
  assert.deepEqual(previewSize(4000, 2000), { width: 1600, height: 800 });
  assert.deepEqual(previewSize(1000, 4000), { width: 400, height: 1600 });
});

test("fitWithin limita a 4096 px conservando proporción", () => {
  assert.deepEqual(fitWithin(2000, 1000), {
    width: 2000,
    height: 1000,
    resized: false,
  });
  const resized = fitWithin(8192, 2048);
  assert.equal(resized.resized, true);
  assert.equal(resized.width, 4096);
  assert.equal(resized.height, 1024);
});

test("snapAngle ajusta a 15/45/75 con tolerancia", () => {
  assert.equal(snapAngle(44), 45);
  assert.equal(snapAngle(16.5), 15);
  assert.equal(snapAngle(30), 30);
});

test("tamaño físico a 300 DPI", () => {
  const { widthCm, heightCm } = physicalSizeCm(300, 600);
  assert.ok(Math.abs(widthCm - 2.54) < 1e-9);
  assert.ok(Math.abs(heightCm - 5.08) < 1e-9);
});

test("los ajustes por defecto son coherentes con los límites", () => {
  assert.equal(DEFAULT_SETTINGS.lpi, 55);
  assert.equal(DEFAULT_SETTINGS.angle, 45);
  assert.equal(DEFAULT_SETTINGS.shape, "round");
  assert.equal(DEFAULT_SETTINGS.mode, "luminance");
  assert.equal(DEFAULT_SETTINGS.bg, "transparent");
});

test("el radio de cada forma conserva el área relativa de cobertura", () => {
  const coverage = 0.4;
  const roundArea =
    (Math.PI / 4) * DOT_RADIUS_SCALE.round ** 2 * coverage;
  const ellipseArea =
    (Math.PI / (2 * 3.64)) * DOT_RADIUS_SCALE.ellipse ** 2 * coverage;
  const diamondArea = DOT_RADIUS_SCALE.diamond ** 2 * coverage;

  for (const area of [roundArea, ellipseArea, diamondArea]) {
    assert.ok(Math.abs(area - coverage) < 1e-10);
  }
  // La fórmula queda espejada en los dos backends.
  assert.ok(
    FRAGMENT_SOURCE.includes(
      `float radiusScale = ${DOT_RADIUS_SCALE.round.toFixed(9)}`
    )
  );
  assert.ok(FRAGMENT_SOURCE.includes("float rr = radiusScale * sqrt(coverage)"));
  assert.ok(
    HALFTONE_COMPUTE_WGSL.includes(
      `var radiusScale = ${DOT_RADIUS_SCALE.round.toFixed(9)}`
    )
  );
  assert.ok(HALFTONE_COMPUTE_WGSL.includes("let rr = radiusScale * sqrt(coverage)"));
});
