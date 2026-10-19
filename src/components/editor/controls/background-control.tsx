"use client";

import { cn } from "@/lib/utils";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import { BG_LABELS, type GarmentBg } from "@/lib/halftone/types";

const swatches: Record<GarmentBg, string> = {
  transparent: "transparent",
  black: "#0B0D12",
  white: "#F2F4F8",
};

const bgs = Object.keys(BG_LABELS) as GarmentBg[];

export function BackgroundControl() {
  const bg = useEditorStore((s) => s.settings.bg);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup label="VISTA DE PRUEBA" value={BG_LABELS[bg]}>
      <div
        role="group"
        aria-label="Fondo de la vista de prueba"
        className="grid grid-cols-3 gap-1.5"
      >
        {bgs.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={bg === b}
            onClick={() => setSettings({ bg: b })}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xs border border-border bg-surface px-1 py-2 transition-colors duration-150 hover:bg-surface-raised",
              bg === b && "border-primary bg-primary/10"
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-5 place-items-center rounded-xs border border-border"
              style={{
                background: swatches[b],
                backgroundImage:
                  b === "transparent"
                    ? "linear-gradient(45deg, #272D3A 25%, transparent 25%, transparent 75%, #272D3A 75%), linear-gradient(45deg, #272D3A 25%, transparent 25%, transparent 75%, #272D3A 75%)"
                    : undefined,
                backgroundSize: b === "transparent" ? "8px 8px" : undefined,
                backgroundPosition:
                  b === "transparent" ? "0 0, 4px 4px" : undefined,
              }}
            />
            <span
              className={cn(
                "tech-value text-[9px]",
                bg === b ? "text-primary" : "text-muted-foreground"
              )}
            >
              {BG_LABELS[b]}
            </span>
          </button>
        ))}
      </div>
    </ControlGroup>
  );
}
