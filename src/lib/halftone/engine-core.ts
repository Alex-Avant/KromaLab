/* ------------------------------------------------------------------ */
/* Núcleo del motor: contexto WebGL2 sobre OffscreenCanvas.            */
/* Compartido por el Web Worker y por el fallback inline del hilo      */
/* principal — un único renderizador GLSL para ambos caminos.          */
/* ------------------------------------------------------------------ */

import { FRAGMENT_SOURCE, VERTEX_SOURCE } from "@/lib/halftone/glsl";
import {
  type HalftoneSettings,
  type GarmentBg,
  cellSizePx,
  previewDpi,
  resolveInkColor,
} from "@/lib/halftone/types";
import type { HalftoneRenderer } from "@/lib/halftone/renderer";

const BG_COLORS: Record<GarmentBg, [number, number, number, number]> = {
  transparent: [0, 0, 0, 0],
  black: [0.043, 0.051, 0.071, 1],
  white: [0.949, 0.957, 0.973, 1],
};

const SHAPE_INT = { round: 0, ellipse: 1, diamond: 2, line: 3 } as const;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "sin log";
    gl.deleteShader(shader);
    throw new Error(`Compilación GLSL fallida: ${log}`);
  }
  return shader;
}

export type EngineUniforms = {
  uImage: WebGLUniformLocation;
  uResolution: WebGLUniformLocation;
  uTileOrigin: WebGLUniformLocation;
  uCellSize: WebGLUniformLocation;
  uAngle: WebGLUniformLocation;
  uContrast: WebGLUniformLocation;
  uGamma: WebGLUniformLocation;
  uMinThreshold: WebGLUniformLocation;
  uInvert: WebGLUniformLocation;
  uShape: WebGLUniformLocation;
  uHardEdge: WebGLUniformLocation;
  uBgColor: WebGLUniformLocation;
  uBgAlpha: WebGLUniformLocation;
  uDotColor: WebGLUniformLocation;
  uSourceColor: WebGLUniformLocation;
};

export type RenderOptions = {
  /** Origen del tile dentro del lienzo de salida (render por regiones). */
  originX?: number;
  originY?: number;
  /** Tamaño del viewport de este render (tile). Por defecto: lienzo completo. */
  viewportWidthPx?: number;
  viewportHeightPx?: number;
  /** Fuerza salida 1-bit (export TIFF) aunque el modo sea luminancia. */
  forceHardEdge?: boolean;
};

export class HalftoneEngineCore implements HalftoneRenderer {
  readonly kind = "webgl2" as const;
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uniforms: EngineUniforms;
  private texture: WebGLTexture | null = null;

  constructor(readonly canvas: OffscreenCanvas) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      // Necesario para que transferToImageBitmap capture el frame ya
      // dibujado en todos los navegadores (el lienzo no se compone).
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 no disponible en este contexto.");

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
    const program = gl.createProgram();
    if (!program) throw new Error("No se pudo crear el programa GL.");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "sin log";
      throw new Error(`Enlace GLSL fallido: ${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    const loc = (name: string): WebGLUniformLocation => {
      const l = gl.getUniformLocation(program, name);
      if (l === null) throw new Error(`Uniform no encontrado: ${name}`);
      return l;
    };

    this.gl = gl;
    this.program = program;
    this.uniforms = {
      uImage: loc("uImage"),
      uResolution: loc("uResolution"),
      uTileOrigin: loc("uTileOrigin"),
      uCellSize: loc("uCellSize"),
      uAngle: loc("uAngle"),
      uContrast: loc("uContrast"),
      uGamma: loc("uGamma"),
      uMinThreshold: loc("uMinThreshold"),
      uInvert: loc("uInvert"),
      uShape: loc("uShape"),
      uHardEdge: loc("uHardEdge"),
      uBgColor: loc("uBgColor"),
      uBgAlpha: loc("uBgAlpha"),
      uDotColor: loc("uDotColor"),
      uSourceColor: loc("uSourceColor"),
    };

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.uniforms.uImage, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  }

  /** Sube (o reemplaza) la imagen original a la GPU. */
  setBitmap(bitmap: ImageBitmap) {
    const gl = this.gl;
    if (!this.texture) {
      this.texture = gl.createTexture();
      if (!this.texture) throw new Error("No se pudo crear la textura.");
    }
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bitmap
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Renderiza la trama. `imageWidthPx` es el ancho de la imagen ORIGINAL
   * y `outputWidthPx`/`outputHeightPx` el tamaño del lienzo de salida
   * (preview escalado o export a resolución completa). Devuelve ms.
   */
  render(
  settings: HalftoneSettings,
  imageWidthPx: number,
  outputWidthPx: number,
  outputHeightPx: number,
  opts: RenderOptions = {}
): number {
  const gl = this.gl;
  const start = performance.now();

  const vw = opts.viewportWidthPx ?? outputWidthPx;
  const vh = opts.viewportHeightPx ?? outputHeightPx;
  const ox = opts.originX ?? 0;
  const oy = opts.originY ?? 0;

  gl.viewport(0, 0, vw, vh);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const u = this.uniforms;
  const dpi = previewDpi(imageWidthPx, outputWidthPx);
  const cell = cellSizePx(settings.lpi, dpi);
  const angle = (settings.angle * Math.PI) / 180;
  const bg = BG_COLORS[settings.bg];
  const { useSourceColor, dotColor: dot } = resolveInkColor(settings);
  const hardEdge = settings.mode === "white" || (opts.forceHardEdge ?? false);

  gl.uniform2f(u.uResolution, outputWidthPx, outputHeightPx);
  gl.uniform2f(u.uTileOrigin, ox, oy);
  gl.uniform1f(u.uCellSize, cell);
  gl.uniform1f(u.uAngle, angle);
  gl.uniform1f(u.uContrast, settings.contrast / 100);
  gl.uniform1f(u.uGamma, settings.gamma);
  gl.uniform1f(u.uMinThreshold, settings.minThreshold / 100);
  gl.uniform1i(u.uInvert, settings.invert ? 1 : 0);
  gl.uniform1i(u.uShape, SHAPE_INT[settings.shape]);
  gl.uniform1i(u.uHardEdge, hardEdge ? 1 : 0);
  gl.uniform3f(u.uBgColor, bg[0], bg[1], bg[2]);
  gl.uniform1f(u.uBgAlpha, bg[3]);
  gl.uniform3f(u.uDotColor, dot[0], dot[1], dot[2]);
  gl.uniform1i(u.uSourceColor, useSourceColor ? 1 : 0);

  // `setBitmap` desvincula la textura tras subirla. Hay que enlazarla de
  // nuevo en cada render o el shader muestrea la textura por defecto y la
  // trama pierde toda la información de la imagen (puntos uniformes).
  if (this.texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.flush();

  return performance.now() - start;
}

  dispose() {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
