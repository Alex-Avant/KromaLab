/* ------------------------------------------------------------------ */
/* Renderizador WebGPU del motor de semitonos.                         */
/*                                                                     */
/* Pipeline: un compute shader WGSL (wgsl.ts) escribe la trama en una  */
/* texture_storage rgba8unorm — una invocación por píxel de salida — y */
/* un render pass trivial la presenta en el lienzo con alpha           */
/* premultiplicado. Implementa la misma interfaz que el renderizador   */
/* WebGL2 (engine-core.ts): el resto del sistema es agnóstico a la     */
/* API de GPU.                                                         */
/*                                                                     */
/* Usado para el PREVIEW en vivo (camino crítico de 60 fps). La        */
/* exportación a resolución completa mantiene el render por tiles      */
/* WebGL2 (export-render.ts), más portable en GPUs antiguas.           */
/* ------------------------------------------------------------------ */

/// <reference types="@webgpu/types" />

import { HALFTONE_COMPUTE_WGSL, PRESENT_FRAGMENT_WGSL, PRESENT_VERTEX_WGSL } from "@/lib/halftone/wgsl";
import {
  cellSizePx,
  previewDpi,
  type HalftoneSettings,
} from "@/lib/halftone/types";
import type { RenderOptions } from "@/lib/halftone/engine-core";
import type { HalftoneRenderer } from "@/lib/halftone/renderer";

const BG_COLORS: Record<string, [number, number, number, number]> = {
  transparent: [0, 0, 0, 0],
  black: [0.043, 0.051, 0.071, 1],
  white: [0.949, 0.957, 0.973, 1],
};
const DOT_WHITE: [number, number, number] = [0.949, 0.957, 0.973];
const DOT_FILM: [number, number, number] = [0.62, 0.66, 0.71];
const SHAPE_INT = { round: 0, ellipse: 1, diamond: 2, line: 3 } as const;

/** Layout de bytes del struct Uniforms de wgsl.ts (alineado a WGSL). */
const UNIFORM_SIZE = 96;
const OFFSETS = {
  resolution: 0,
  tileOrigin: 8,
  bgColor: 16,
  dotColor: 32,
  cellSize: 44,
  angle: 48,
  contrast: 52,
  gamma: 56,
  minThreshold: 60,
  invert: 64,
  shape: 68,
  hardEdge: 72,
  bgAlpha: 76,
} as const;

export class WebGPURenderer implements HalftoneRenderer {
  readonly kind = "webgpu" as const;
  readonly canvas: OffscreenCanvas;

  private device: GPUDevice;
  private context: GPUCanvasContext;
  private computePipeline: GPUComputePipeline;
  private presentPipeline: GPURenderPipeline;
  private uniformBuffer: GPUBuffer;
  private bindGroupLayout: GPUBindGroupLayout;
  private imageTexture: GPUTexture | null = null;
  private storageTexture: GPUTexture | null = null;
  private storageSize = { w: 0, h: 0 };

  constructor(canvas: OffscreenCanvas, device: GPUDevice) {
    this.canvas = canvas;
    this.device = device;

    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("Sin contexto WebGPU en el lienzo.");
    this.context = context;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });

    const computeModule = device.createShaderModule({
      label: "kromalab-halftone",
      code: HALFTONE_COMPUTE_WGSL,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: "float" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, sampler: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba8unorm" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });

    this.uniformBuffer = device.createBuffer({
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: { module: computeModule, entryPoint: "halftone" },
    });

    const presentModule = device.createShaderModule({
      label: "kromalab-present",
      code: PRESENT_VERTEX_WGSL + PRESENT_FRAGMENT_WGSL,
    });
    const presentBindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      ],
    });
    this.presentPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [presentBindGroupLayout],
      }),
      vertex: { module: presentModule, entryPoint: "vs" },
      fragment: {
        module: presentModule,
        entryPoint: "fs",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });

    // El bind group de presentación se crea por frame (la storage
    // texture puede cambiar de tamaño entre previews).
    this.presentBindGroupLayout = presentBindGroupLayout;
  }

  private presentBindGroupLayout: GPUBindGroupLayout;

  setBitmap(bitmap: ImageBitmap) {
    const device = this.device;
    this.imageTexture?.destroy();
    const texture = device.createTexture({
      size: [bitmap.width, bitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture },
      [bitmap.width, bitmap.height, 1]
    );
    this.imageTexture = texture;
  }

  private ensureStorage(w: number, h: number) {
    if (this.storageTexture && this.storageSize.w === w && this.storageSize.h === h) {
      return;
    }
    this.storageTexture?.destroy();
    this.storageTexture = this.device.createTexture({
      size: [w, h, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.storageSize = { w, h };
  }

  async render(
    settings: HalftoneSettings,
    imageWidthPx: number,
    outputWidthPx: number,
    outputHeightPx: number,
    opts: RenderOptions = {}
  ): Promise<number> {
    const start = performance.now();
    const device = this.device;
    const vw = opts.viewportWidthPx ?? outputWidthPx;
    const vh = opts.viewportHeightPx ?? outputHeightPx;
    const ox = opts.originX ?? 0;
    const oy = opts.originY ?? 0;

    this.ensureStorage(outputWidthPx, outputHeightPx);

    const dpi = previewDpi(imageWidthPx, outputWidthPx);
    const cell = cellSizePx(settings.lpi, dpi);
    const angle = (settings.angle * Math.PI) / 180;
    const bg = BG_COLORS[settings.bg];
    const dot = settings.bg === "white" ? DOT_FILM : DOT_WHITE;
    const hardEdge = settings.mode === "white" || (opts.forceHardEdge ?? false);

    // Uniformes con el layout de wgsl.ts (Float32Array + vistas u32).
    const floats = new Float32Array(UNIFORM_SIZE / 4);
    const uints = new Uint32Array(floats.buffer);
    floats.set([outputWidthPx, outputHeightPx], OFFSETS.resolution / 4);
    floats.set([ox, oy], OFFSETS.tileOrigin / 4);
    floats.set([bg[0], bg[1], bg[2]], OFFSETS.bgColor / 4);
    floats.set([dot[0], dot[1], dot[2]], OFFSETS.dotColor / 4);
    floats[OFFSETS.cellSize / 4] = cell;
    floats[OFFSETS.angle / 4] = angle;
    floats[OFFSETS.contrast / 4] = settings.contrast / 100;
    floats[OFFSETS.gamma / 4] = settings.gamma;
    floats[OFFSETS.minThreshold / 4] = settings.minThreshold / 100;
    uints[OFFSETS.invert / 4] = settings.invert ? 1 : 0;
    uints[OFFSETS.shape / 4] = SHAPE_INT[settings.shape];
    uints[OFFSETS.hardEdge / 4] = hardEdge ? 1 : 0;
    floats[OFFSETS.bgAlpha / 4] = bg[3];
    device.queue.writeBuffer(this.uniformBuffer, 0, floats.buffer);

    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });
    const computeBindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: this.imageTexture!.createView() },
        { binding: 1, resource: sampler },
        { binding: 2, resource: this.storageTexture!.createView() },
        { binding: 3, resource: { buffer: this.uniformBuffer } },
      ],
    });
    const presentBindGroup = device.createBindGroup({
      layout: this.presentBindGroupLayout,
      entries: [
        { binding: 0, resource: this.storageTexture!.createView() },
      ],
    });

    const encoder = device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(vw / 8), Math.ceil(vh / 8));
    computePass.end();

    const view = this.context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    renderPass.setPipeline(this.presentPipeline);
    renderPass.setBindGroup(0, presentBindGroup);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    return performance.now() - start;
  }

  dispose() {
    this.imageTexture?.destroy();
    this.storageTexture?.destroy();
    this.uniformBuffer.destroy();
    this.device.destroy();
  }
}
