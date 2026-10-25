"use client";

import { cn } from "@/lib/utils";
import {
  BUILTIN_PRESETS,
  resolvePresetSettings,
  type Preset,
} from "@/lib/halftone/presets";
import { useEditorStore } from "@/store/editor-store";
import type { HalftoneSettings } from "@/lib/halftone/types";

const THUMB = 44;

/** Miniatura real de la trama: puntos generados con LPI/ángulo/forma. */
function PresetThumb({ settings }: { settings: HalftoneSettings }) {
  const cell = Math.max(3, Math.min(9, 210 / settings.lpi));
  const radius = cell * 0.33;
  const radians = (settings.angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const range = Math.ceil((THUMB * 1.5) / cell);
  const dots: { x: number; y: number }[] = [];
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      const x = THUMB / 2 + i * cell * cos - j * cell * sin;
      const y = THUMB / 2 + i * cell * sin + j * cell * cos;
      if (x > 1 && x < THUMB - 1 && y > 1 && y < THUMB - 1) {
        dots.push({ x, y });
      }
    }
  }

  const fill = settings.mode === "white" ? "#F43FA0" : "#22D3EE";

  return (
    <svg
      viewBox={`0 0 ${THUMB} ${THUMB}`}
      className="size-11 shrink-0 rounded-xs border border-border bg-background"
      aria-hidden="true"
    >
      {dots.map((dot, index) => {
        if (settings.shape === "ellipse") {
          return (
            <ellipse
              key={index}
              cx={dot.x}
              cy={dot.y}
              rx={radius * 1.25}
              ry={radius * 0.65}
              fill={fill}
            />
          );
        }
        if (settings.shape === "diamond") {
          return (
            <rect
              key={index}
              x={dot.x - radius}
              y={dot.y - radius}
              width={radius * 2}
              height={radius * 2}
              transform={`rotate(45 ${dot.x} ${dot.y})`}
              fill={fill}
            />
          );
        }
        if (settings.shape === "line") {
          return (
            <rect
              key={index}
              x={dot.x - radius * 1.6}
              y={dot.y - radius * 0.5}
              width={radius * 3.2}
              height={radius}
              fill={fill}
            />
          );
        }
        return (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r={radius}
            fill={fill}
          />
        );
      })}
    </svg>
  );
}

const CALIBRATION_KEYS = [
  "lpi",
  "angle",
  "shape",
  "contrast",
  "gamma",
  "minThreshold",
  "invert",
  "mode",
] as const;

function isActivePreset(preset: Preset, current: HalftoneSettings): boolean {
  const resolved = resolvePresetSettings(preset.settings);
  return CALIBRATION_KEYS.every((key) => resolved[key] === current[key]);
}

/**
 * Fórmulas de fábrica con miniatura de la trama. Se aplican de forma
 * atómica (todos los parámetros de calibración a la vez).
 */
export function PresetStrip() {
  const settings = useEditorStore((s) => s.settings);
  const applyPreset = useEditorStore((s) => s.applyPreset);

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="flex items-baseline justify-between">
        <h3 className="tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          FÓRMULAS
        </h3>
        <span className="text-[11px] text-muted-foreground">
          Un clic = toda la calibración
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
        {BUILTIN_PRESETS.map((preset) => {
          const resolved = resolvePresetSettings(preset.settings);
          const active = isActivePreset(preset, settings);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-xs border border-border bg-surface px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-raised",
                active && "border-primary bg-primary/10"
              )}
            >
              <PresetThumb settings={resolved} />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-sm font-medium",
                    active ? "text-primary" : "text-foreground"
                  )}
                >
                  {preset.name}
                </span>
                <span className="tech-value block text-[10px] text-muted-foreground">
                  {resolved.lpi} LPI · {resolved.angle}° ·{" "}
                  {resolved.shape === "round"
                    ? "redondo"
                    : resolved.shape === "ellipse"
                      ? "elipse"
                      : resolved.shape === "diamond"
                        ? "diamante"
                        : "línea"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
