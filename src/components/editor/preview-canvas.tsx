"use client";

import * as React from "react";
import { AlertTriangleIcon } from "lucide-react";

import { useEditorStore } from "@/store/editor-store";
import { ImageDropzone } from "@/components/editor/image-dropzone";
import { ViewportControls } from "@/components/editor/viewport-controls";
import { previewSize } from "@/lib/halftone/types";
import { PreviewFrameBuffer } from "@/lib/halftone/frame-buffer";
import type { FramePayload } from "@/lib/halftone/worker-client";

export type PreviewCanvasHandle = {
  drawFrame: (frame: FramePayload) => void;
};

type PreviewCanvasProps = {
  onFiles: (files: File[]) => void;
};

const ZOOM_MIN = 10;
const ZOOM_MAX = 400;
const LOUPE_SIZE = 176;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Lienzo central del editor con instrumentos de navegación:
 *  - Zoom 10–400% con la rueda (anclado al cursor).
 *  - Pan con Espacio + arrastre.
 *  - Divisor ORIGINAL / TRAMA arrastrable (composición por capas
 *    recortadas en espacio de pantalla; ambas capas comparten
 *    transformación).
 *  - Lupa ⌖ manteniendo Alt: magnifica la trama bajo el cursor.
 *
 * El render pesado ocurre en el motor (worker/fallback); aquí solo
 * hay blitting y composición.
 */
export const PreviewCanvas = React.forwardRef<
  PreviewCanvasHandle,
  PreviewCanvasProps
>(function PreviewCanvas({ onFiles }, ref) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tramaCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const loupeCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [frameBuffer] = React.useState(() => new PreviewFrameBuffer());

  const hasFrameRef = React.useRef(false);
  const fitScaleRef = React.useRef(1);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [hasFrame, setHasFrame] = React.useState(false);
  const loupeStateRef = React.useRef<{ x: number; y: number } | null>(null);

  const altRef = React.useRef(false);
  const spaceRef = React.useRef(false);
  const dragRef = React.useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const [dims, setDims] = React.useState({ w: 0, h: 0 });
  const [loupe, setLoupe] = React.useState<{ x: number; y: number } | null>(
    null
  );

  const image = useEditorStore((s) => s.image);
  const error = useEditorStore((s) => s.error);
  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const split = useEditorStore((s) => s.split);
  const setSplit = useEditorStore((s) => s.setSplit);

  const fitScale = (() => {
    const { w: cw, h: ch } = box;
    if (!cw || !ch || !dims.w || !dims.h) return 1;
    return Math.min(cw / dims.w, ch / dims.h);
  })();
  fitScaleRef.current = fitScale;
  const k = fitScale * (viewport.zoom / 100);

  const redrawLoupe = React.useCallback(() => {
    const lc = loupeCanvasRef.current;
    const tc = tramaCanvasRef.current;
    if (!lc || !tc || !dims.w || !dims.h) return;
    const state = loupeStateRef.current;
    if (!state) return;
    const rect = tc.getBoundingClientRect();
    if (rect.width === 0) return;
    const tx = ((state.x - rect.left) / rect.width) * dims.w;
    const ty = ((state.y - rect.top) / rect.height) * dims.h;
    const actualScale = rect.width / dims.w;
    const mag = clamp(2.5 / Math.max(actualScale, 0.001), 3, 16);
    const r = (LOUPE_SIZE / mag) / 2;
    const sx = clamp(tx - r, 0, Math.max(0, dims.w - r * 2));
    const sy = clamp(ty - r, 0, Math.max(0, dims.h - r * 2));
    lc.width = LOUPE_SIZE;
    lc.height = LOUPE_SIZE;
    lc.getContext("2d")?.drawImage(
      tc,
      sx,
      sy,
      r * 2,
      r * 2,
      0,
      0,
      LOUPE_SIZE,
      LOUPE_SIZE
    );
  }, [dims]);

  React.useEffect(() => {
    loupeStateRef.current = loupe;
    if (loupe) redrawLoupe();
  }, [loupe, redrawLoupe]);

  const drawFrame = React.useCallback(
    ({ bitmap }: FramePayload) => {
      const canvas = tramaCanvasRef.current;
      if (!canvas) {
        // El lienzo aún no está montado: conservar el frame más reciente
        // (cerrando el pendiente anterior) y pintarlo al montar.
        frameBuffer.enqueue(bitmap);
        return;
      }
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      frameBuffer.commit(bitmap);
      hasFrameRef.current = true;
      setHasFrame(true);
      setDims({ w: bitmap.width, h: bitmap.height });
      if (loupeStateRef.current) {
        // Siguiente frame: la lupa se redibuja en el efecto del estado dims.
        setLoupe((prev) => (prev ? { ...prev } : prev));
      }
    },
    [frameBuffer]
  );

  React.useImperativeHandle(ref, () => ({ drawFrame }), [drawFrame]);

  // La vista ORIGINAL y el placeholder usan el archivo vía object URL:
  // no dependen de GPU ni de canvas, así que la muestra siempre se ve.
  React.useEffect(() => {
    if (!image) return;
    hasFrameRef.current = false;
    setHasFrame(false);
    const preview = previewSize(image.width, image.height);
    setDims({ w: preview.width, h: preview.height });
  }, [image]);

  // Si llegó un frame antes de que el lienzo estuviera montado, se pinta
  // en cuanto la imagen entra en el árbol.
  React.useEffect(() => {
    if (!image) return;
    const pending = frameBuffer.takePending();
    if (pending) drawFrame({ bitmap: pending, renderMs: 0 });
  }, [image, drawFrame, frameBuffer]);

  // Limpieza de bitmaps (pendiente y actual, una sola vez).
  React.useEffect(() => {
    return () => frameBuffer.dispose();
  }, [frameBuffer]);

  // Observación del contenedor (escala de ajuste).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setBox({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom con rueda (no pasivo para preventDefault) anclado al cursor.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const state = useEditorStore.getState();
      const f = Math.max(fitScaleRef.current, 0.001);
      const oldK = f * (state.viewport.zoom / 100);
      const zoom = clamp(
        state.viewport.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12),
        ZOOM_MIN,
        ZOOM_MAX
      );
      const ratio = (f * (zoom / 100)) / oldK;
      state.setViewport({
        zoom,
        panX: cx - (cx - state.viewport.panX) * ratio,
        panY: cy - (cy - state.viewport.panY) * ratio,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pan con Espacio + arrastre, y lupa con Alt.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.getAttribute("role") === "slider" ||
          target.getAttribute("role") === "separator" ||
          target.isContentEditable);
      if (e.code === "Space" && !editable) {
        spaceRef.current = true;
        e.preventDefault();
      }
      if (e.key === "Alt") altRef.current = true;
      if (e.key === "Escape") {
        spaceRef.current = false;
        altRef.current = false;
        setLoupe(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceRef.current = false;
      if (e.key === "Alt") {
        altRef.current = false;
        setLoupe(null);
      }
    };
    const onBlur = () => {
      spaceRef.current = false;
      altRef.current = false;
      setLoupe(null);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!spaceRef.current || !image) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: useEditorStore.getState().viewport.panX,
      panY: useEditorStore.getState().viewport.panY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    if (dragRef.current) {
      const d = dragRef.current;
      setViewport({
        panX: d.panX + (e.clientX - d.x),
        panY: d.panY + (e.clientY - d.y),
      });
    }
    if (altRef.current && image) {
      setLoupe({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Arrastre del divisor ORIGINAL / TRAMA.
  const onSplitDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const fraction = clamp((ev.clientX - rect.left) / rect.width, 0.05, 0.95);
      setSplit({ fraction });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const panLimitX = (dims.w * k) / 2 + 40;
  const panLimitY = (dims.h * k) / 2 + 40;
  const panX = clamp(viewport.panX, -panLimitX, panLimitX);
  const panY = clamp(viewport.panY, -panLimitY, panLimitY);
  const appliedTransform = `translate(${panX}px, ${panY}px) scale(${k})`;

  const layerStyle: React.CSSProperties = {
    transform: appliedTransform,
    width: dims.w || 0,
    height: dims.h || 0,
    marginLeft: -(dims.w || 0) / 2,
    marginTop: -(dims.h || 0) / 2,
  };

  return (
    <div
      ref={containerRef}
      className={
        "absolute inset-0 overflow-hidden " +
        (loupe ? "cursor-none" : spaceRef.current && image ? "cursor-grab" : "")
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setLoupe(null)}
    >
      {image && (
        <>
          {/* Capa ORIGINAL — izquierda del divisor */}
          <div
            className="absolute inset-0 z-10"
            style={{
              clipPath: `inset(0 ${100 - split.fraction * 100}% 0 0)`,
              display: split.enabled ? "block" : "none",
            }}
          >
            <div
              className="absolute top-1/2 left-1/2 will-change-transform"
              style={layerStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL local, no optimizable */}
              <img
                src={image.url}
                alt=""
                draggable={false}
                className="h-full w-full select-none"
              />
            </div>
          </div>

          {/* Capa TRAMA — derecha del divisor */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: split.enabled
                ? `inset(0 0 0 ${split.fraction * 100}%)`
                : undefined,
            }}
          >
            <div
              className="absolute top-1/2 left-1/2 will-change-transform"
              style={layerStyle}
            >
              {/* Placeholder sin GPU: la muestra se ve antes del primer
                  frame y permanece si el motor no produce imagen. */}
              {!hasFrame && (
                // eslint-disable-next-line @next/next/no-img-element -- placeholder local sin GPU
                <img
                  src={image.url}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none"
                />
              )}
              <canvas
                ref={tramaCanvasRef}
                aria-label="Preview de la trama de semitonos"
                className="relative h-full w-full"
              />
            </div>
          </div>

          {/* Divisor */}
          {split.enabled && (
            <>
              <div
                className="absolute inset-y-0 z-20 w-px bg-primary"
                style={{ left: `${split.fraction * 100}%` }}
                aria-hidden="true"
              />
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Divisor original trama"
                aria-valuenow={Math.round(split.fraction * 100)}
                tabIndex={0}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 0.02 : 0.05;
                  if (e.key === "ArrowLeft") {
                    setSplit({ fraction: clamp(split.fraction - step, 0.05, 0.95) });
                  } else if (e.key === "ArrowRight") {
                    setSplit({ fraction: clamp(split.fraction + step, 0.05, 0.95) });
                  }
                }}
                onPointerDown={onSplitDown}
                className="absolute inset-y-0 z-20 w-4 -translate-x-1/2 cursor-col-resize touch-none"
                style={{ left: `${split.fraction * 100}%` }}
              >
                <span className="absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xs border border-border bg-surface">
                  <span className="flex gap-0.5" aria-hidden="true">
                    <span className="h-2.5 w-px bg-primary" />
                    <span className="h-2.5 w-px bg-primary" />
                  </span>
                </span>
              </div>
              <span className="tech-value absolute bottom-3 left-3 z-20 rounded-xs bg-background/80 px-2 py-1 text-[10px] tracking-[0.2em] text-foreground">
                ORIGINAL
              </span>
              <span className="tech-value absolute right-3 bottom-3 z-20 rounded-xs bg-background/80 px-2 py-1 text-[10px] tracking-[0.2em] text-foreground">
                TRAMA
              </span>
            </>
          )}

          {/* Lupa ⌖ */}
          {loupe && (
            <div
              className="pointer-events-none absolute z-30 rounded-md border border-primary bg-surface shadow-lg"
              style={{
                left: Math.min(
                  loupe.x + 24,
                  Math.max((box.w || 0) - LOUPE_SIZE - 8, 0)
                ),
                top: Math.min(
                  loupe.y + 24,
                  Math.max((box.h || 0) - LOUPE_SIZE - 8, 0)
                ),
                width: LOUPE_SIZE,
                height: LOUPE_SIZE,
              }}
              aria-hidden="true"
            >
              <canvas
                ref={loupeCanvasRef}
                className="h-full w-full"
                width={LOUPE_SIZE}
                height={LOUPE_SIZE}
              />
              <span className="absolute top-1/2 left-0 h-px w-full bg-primary/50" />
              <span className="absolute top-0 left-1/2 h-full w-px bg-primary/50" />
              <span className="tech-value absolute top-1 left-1 rounded-xs bg-background/80 px-1 text-[9px] tracking-[0.2em] text-primary">
                ⌖ LUPA
              </span>
            </div>
          )}

          {!hasFrame && !error && (
            <span className="tech-value absolute top-3 left-3 z-20 rounded-xs border border-border bg-background/85 px-2 py-1 text-[10px] tracking-[0.16em] text-primary">
              CALIBRANDO TRAMA…
            </span>
          )}

          <ViewportControls />
        </>
      )}

      {/* Sin imagen: el dropzone siempre está disponible; un error de
          carga se muestra encima para poder reintentar. */}
      {!image && (
        <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-6">
          {error && (
            <div
              role="alert"
              className="flex w-full max-w-md items-start gap-3 rounded-md border border-warning/40 bg-surface px-4 py-3"
            >
              <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-foreground">
                  No se pudo cargar la muestra
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>
          )}
          <ImageDropzone onFiles={onFiles} />
        </div>
      )}

      {/* Error posterior con muestra cargada: aviso sin ocultar el lienzo. */}
      {image && error && (
        <div
          role="alert"
          className="absolute top-3 left-3 z-30 max-w-[60%] rounded-xs border border-warning/40 bg-surface px-3 py-2"
        >
          <p className="tech-value text-[10px] tracking-[0.08em] text-warning">
            {error}
          </p>
        </div>
      )}
    </div>
  );
});
