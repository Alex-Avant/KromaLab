"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import { SHAPE_LABELS, type DotShape } from "@/lib/halftone/types";

const icons: Record<DotShape, React.ReactNode> = {
  round: <circle cx="12" cy="12" r="7" fill="currentColor" />,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="4.2" fill="currentColor" />,
  diamond: (
    <rect
      x="7.4"
      y="7.4"
      width="9.2"
      height="9.2"
      transform="rotate(45 12 12)"
      fill="currentColor"
    />
  ),
  line: <rect x="3.5" y="10" width="17" height="4" fill="currentColor" />,
};

const shapes = Object.keys(SHAPE_LABELS) as DotShape[];

export function ShapeControl() {
  const shape = useEditorStore((s) => s.settings.shape);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup label="FORMA DE PUNTO" value={SHAPE_LABELS[shape]}>
      <div
        role="group"
        aria-label="Forma de punto"
        className="grid grid-cols-4 gap-1.5"
      >
        {shapes.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={shape === s}
            onClick={() => setSettings({ shape: s })}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xs border border-border bg-surface px-1 py-2.5 text-muted-foreground transition-colors duration-150 hover:bg-surface-raised hover:text-foreground",
              shape === s &&
                "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              {icons[s]}
            </svg>
            <span className="tech-value text-[9px] tracking-wide">
              {SHAPE_LABELS[s]}
            </span>
          </button>
        ))}
      </div>
    </ControlGroup>
  );
}
