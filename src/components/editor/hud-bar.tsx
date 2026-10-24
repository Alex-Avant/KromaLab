"use client";

import { useEditorStore } from "@/store/editor-store";
import { CmykBars } from "@/components/site/cmyk-bars";
import {
  cellCountAcross,
  previewSize,
} from "@/lib/halftone/types";

/**
 * HUD de telemetría inferior: API de GPU activa, frecuencia de trama,
 * ángulo, células y tiempo de render, más barras de calibración CMYK.
 */
export function HudBar() {
  const stats = useEditorStore((s) => s.stats);
  const settings = useEditorStore((s) => s.settings);
  const image = useEditorStore((s) => s.image);
  const zoom = useEditorStore((s) => s.viewport.zoom);

  const cells =
    image === null
      ? null
      : cellCountAcross(
          image.width,
          previewSize(image.width, image.height).width,
          settings.lpi
        );

  return (
    <footer
      className="flex h-9 shrink-0 items-center gap-5 overflow-x-auto whitespace-nowrap border-t border-border bg-background px-4 [scrollbar-width:none]"
      aria-label="Telemetría del editor"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={
            "size-1.5 rounded-full " +
            (stats.ready ? "bg-primary" : "bg-muted-foreground")
          }
          aria-hidden="true"
        />
        <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
          GPU:{" "}
          <span className={stats.ready ? "text-primary" : ""}>
            {stats.ready
              ? stats.api === "webgpu"
                ? "WEBGPU"
                : "WEBGL2"
              : "—"}
          </span>
        </span>
      </span>
      <span className="tech-value hidden text-[10px] tracking-[0.14em] text-muted-foreground sm:inline">
        MOTOR:{" "}
        <span className="text-foreground">
          {stats.engine === "worker"
            ? "WORKER"
            : stats.engine === "inline"
              ? "INLINE"
              : "—"}
        </span>
      </span>
      <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
        LPI: <span className="text-foreground">{settings.lpi}</span>
      </span>
      <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
        ÁNG: <span className="text-foreground">{settings.angle}°</span>
      </span>
      <span className="tech-value hidden text-[10px] tracking-[0.14em] text-muted-foreground md:inline">
        CÉLULAS:{" "}
        <span className="text-foreground">{cells ?? "—"}</span>
      </span>
      <span className="tech-value hidden text-[10px] tracking-[0.14em] text-muted-foreground sm:inline">
        ZOOM: <span className="text-foreground">{zoom}%</span>
      </span>
      <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
        RENDER:{" "}
        <span className="text-foreground">
          {stats.renderMs > 0 ? `${stats.renderMs.toFixed(1)} MS` : "—"}
        </span>
      </span>
      <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
        FRAMES:{" "}
        <span
          className={
            stats.ready && stats.frames === 0
              ? "text-warning"
              : "text-foreground"
          }
        >
          {stats.ready && stats.frames === 0 ? "SIN FRAMES" : stats.frames}
        </span>
      </span>
      <div className="ml-auto w-40">
        <CmykBars />
      </div>
    </footer>
  );
}
