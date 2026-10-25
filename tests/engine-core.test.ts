import assert from "node:assert/strict";
import test from "node:test";

import { HalftoneEngineCore } from "@/lib/halftone/engine-core";
import { DEFAULT_SETTINGS } from "@/lib/halftone/types";

type Event = { name: string; detail?: string };


class FakeGL {
  readonly events: Event[] = [];
  readonly texture = { kind: "image-texture" };

  createShader() {
    return {};
  }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() {
    return true;
  }
  getShaderInfoLog() {
    return "";
  }
  createProgram() {
    return {};
  }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() {
    return true;
  }
  getProgramInfoLog() {
    return "";
  }
  deleteShader() {}
  useProgram() {}
  getUniformLocation(_program: unknown, name: string) {
    return name;
  }
  activeTexture(unit: number) {
    this.events.push({ name: "activeTexture", detail: String(unit) });
  }
  uniform1i(location: string, value: number) {
    this.events.push({ name: "uniform1i", detail: `${location}=${value}` });
  }
  uniform1f(location: string, value: number) {
    this.events.push({ name: "uniform1f", detail: `${location}=${value}` });
  }
  uniform2f(location: string) {
    this.events.push({ name: "uniform2f", detail: location });
  }
  uniform3f(location: string, x: number) {
    this.events.push({ name: "uniform3f", detail: `${location}=${x}` });
  }
  disable() {}
  pixelStorei() {}
  createTexture() {
    return this.texture;
  }
  bindTexture(_target: number, texture: unknown) {
    this.events.push({
      name: "bindTexture",
      detail: texture ? "image" : "null",
    });
  }
  texImage2D() {}
  texParameteri() {}
  deleteTexture() {}
  deleteProgram() {}
  getExtension(name: string) {
    return name === "WEBGL_lose_context" ? { loseContext() {} } : null;
  }
  viewport() {}
  clearColor() {}
  clear() {}
  drawArrays() {
    this.events.push({ name: "drawArrays" });
  }
  flush() {}
}

function fakeCanvas(gl: FakeGL): OffscreenCanvas {
  return {
    getContext: () => gl,
  } as unknown as OffscreenCanvas;
}

function fakeBitmap(width: number, height: number): ImageBitmap {
  return { width, height } as unknown as ImageBitmap;
}

function assertTextureBoundBeforeDraw(events: Event[], label: string) {
  const lastNull = events.map((e) => e.name + ":" + e.detail).lastIndexOf("bindTexture:null");
  assert.ok(lastNull >= 0, `${label}: setBitmap debe desvincular tras subir`);

  const bindIndex = events.findIndex(
    (event, index) =>
      index > lastNull && event.name === "bindTexture" && event.detail === "image"
  );
  const drawIndex = events.findIndex((event) => event.name === "drawArrays");

  assert.ok(drawIndex >= 0, `${label}: debe dibujar`);
  assert.ok(
    bindIndex > lastNull && bindIndex < drawIndex,
    `${label}: render debe vincular la imagen antes de drawArrays`
  );
}

test("la textura de la imagen queda vinculada antes de dibujar", () => {
  const gl = new FakeGL();
  const engine = new HalftoneEngineCore(fakeCanvas(gl));

  engine.setBitmap(fakeBitmap(64, 48));
  engine.render(DEFAULT_SETTINGS, 64, 64, 48);

  assertTextureBoundBeforeDraw(gl.events, "primer render");
});

test("tras cargar otra imagen se vuelve a vincular la textura", () => {
  const gl = new FakeGL();
  const engine = new HalftoneEngineCore(fakeCanvas(gl));

  engine.setBitmap(fakeBitmap(32, 32));
  engine.render(DEFAULT_SETTINGS, 32, 32, 32);
  engine.setBitmap(fakeBitmap(128, 64));
  engine.render(DEFAULT_SETTINGS, 128, 128, 64);

  const draws = gl.events.filter((event) => event.name === "drawArrays");
  assert.equal(draws.length, 2, "dos renders");

  const secondDraw = gl.events.findIndex(
    (event, index) =>
      event.name === "drawArrays" &&
      gl.events.slice(0, index).filter((e) => e.name === "drawArrays").length === 1
  );
  const nullBefore = gl.events
    .map((e) => e.name + ":" + e.detail)
    .lastIndexOf("bindTexture:null", secondDraw);
  const bindBefore = gl.events.findIndex(
    (event, index) =>
      index > nullBefore && index < secondDraw && event.name === "bindTexture" && event.detail === "image"
  );
  assert.ok(bindBefore > 0, "segundo render con textura vinculada");
});

test("el tinte blanco fuerza tinta uniforme y el color original usa la imagen", () => {
  const gl = new FakeGL();
  const engine = new HalftoneEngineCore(fakeCanvas(gl));
  engine.setBitmap(fakeBitmap(16, 16));

  engine.render({ ...DEFAULT_SETTINGS, colorMode: "color" }, 16, 16, 16);
  const colorRender = gl.events.filter((event) => event.name === "uniform1i");
  assert.ok(
    colorRender.some((event) => event.detail === "uSourceColor=1"),
    "color original activa uSourceColor"
  );

  gl.events.length = 0;
  engine.render({ ...DEFAULT_SETTINGS, colorMode: "grayscale" }, 16, 16, 16);
  const grayRender = gl.events.filter((event) => event.name === "uniform1i");
  assert.ok(
    grayRender.some((event) => event.detail === "uSourceColor=0"),
    "grises desactiva uSourceColor"
  );
  const grayColor = gl.events.filter((event) => event.name === "uniform3f");
  assert.ok(
    grayColor.some((event) => event.detail === "uDotColor=0.08"),
    "grises usa tinta oscura"
  );
});

test("modo tinta blanca prevalece sobre color original", () => {
  const gl = new FakeGL();
  const engine = new HalftoneEngineCore(fakeCanvas(gl));
  engine.setBitmap(fakeBitmap(16, 16));

  engine.render(
    { ...DEFAULT_SETTINGS, mode: "white", colorMode: "color" },
    16,
    16,
    16
  );
  const uniforms = gl.events.filter((event) => event.name === "uniform1i");
  assert.ok(uniforms.some((event) => event.detail === "uSourceColor=0"));
  const colors = gl.events.filter((event) => event.name === "uniform3f");
  assert.ok(colors.some((event) => event.detail === "uDotColor=0.949"));
});
