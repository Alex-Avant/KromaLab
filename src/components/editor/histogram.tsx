"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";

/**
 * Histograma de luminancia de la imagen original (256 bins),
 * calculado en el worker al cargar la muestra.
 */
export function Histogram() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const bins = useEditorStore((s) => s.histogram);
  const image = useEditorStore((s) => s.image);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bins) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    let max = 1;
    for (let i = 0; i < 256; i++) max = Math.max(max, bins[i]);
    const bw = w / 256;
    for (let i = 0; i < 256; i++) {
      const bh = (bins[i] / max) * (h - 2);
      ctx.fillStyle = "#22D3EE";
      ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 0.5), bh);
    }
  }, [bins]);

  return (
    <div className="border-t border-border bg-surface/40 px-4 py-2">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <span className="tech-value text-[9px] tracking-[0.2em] text-muted-foreground">
            HISTOGRAMA — LUMINANCIA
          </span>
          <span className="tech-value text-[9px] tracking-[0.14em] text-muted-foreground">
            {image ? `${image.width} × ${image.height} PX` : "SIN MUESTRA"}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          className="mt-1 h-14 w-full"
          aria-hidden="true"
        />
        <div className="flex justify-between">
          <span className="tech-value text-[9px] text-muted-foreground">0</span>
          <span className="tech-value text-[9px] text-muted-foreground">128</span>
          <span className="tech-value text-[9px] text-muted-foreground">255</span>
        </div>
      </div>
    </div>
  );
}
