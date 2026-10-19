"use client";

import { MinusIcon, PlusIcon, MaximizeIcon, Columns2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function ViewportControls() {
  const image = useEditorStore((s) => s.image);
  const zoom = useEditorStore((s) => s.viewport.zoom);
  const setViewport = useEditorStore((s) => s.setViewport);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const splitEnabled = useEditorStore((s) => s.split.enabled);
  const setSplit = useEditorStore((s) => s.setSplit);

  if (!image) return null;

  const zoomBy = (factor: number) =>
    setViewport({ zoom: clamp(Math.round(zoom * factor), 10, 400) });

  const btn =
    "grid size-8 place-items-center rounded-xs border border-border bg-background/85 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  return (
    <div
      className="absolute top-3 right-3 z-20 flex items-center gap-1"
      role="group"
      aria-label="Controles de navegación del lienzo"
    >
      <button
        type="button"
        className={btn}
        onClick={() => zoomBy(1 / 1.25)}
        aria-label="Alejar"
      >
        <MinusIcon aria-hidden="true" className="size-3.5" />
      </button>
      <span className="tech-value w-14 rounded-xs border border-border bg-background/85 py-1.5 text-center text-[10px] text-foreground">
        {zoom}%
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => zoomBy(1.25)}
        aria-label="Acercar"
      >
        <PlusIcon aria-hidden="true" className="size-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={resetViewport}
        aria-label="Restablecer zoom"
        title="Ajustar a pantalla"
      >
        <MaximizeIcon aria-hidden="true" className="size-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <button
        type="button"
        className={cn(btn, splitEnabled && "border-primary text-primary")}
        onClick={() => setSplit({ enabled: !splitEnabled })}
        aria-pressed={splitEnabled}
        aria-label="Mostrar divisor original trama"
        title="Divisor ORIGINAL / TRAMA"
      >
        <Columns2Icon aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}
