"use client";

import { cn } from "@/lib/utils";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import { COLOR_MODE_LABELS, type ColorMode } from "@/lib/halftone/types";

const options: { id: ColorMode; description: string }[] = [
  {
    id: "color",
    description: "Conserva el color original de la imagen.",
  },
  {
    id: "grayscale",
    description: "Convierte la trama a monocromo.",
  },
];

export function ColorModeControl() {
  const colorMode = useEditorStore((s) => s.settings.colorMode);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup
      label="PROCESAMIENTO"
      value={COLOR_MODE_LABELS[colorMode]}
      hint="El color original se conserva por defecto; la escala de grises es opcional."
    >
      <div
        role="group"
        aria-label="Procesamiento de color"
        className="grid grid-cols-2 gap-1.5"
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={colorMode === option.id}
            onClick={() => setSettings({ colorMode: option.id })}
            className={cn(
              "rounded-xs border border-border bg-surface px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-raised",
              colorMode === option.id && "border-primary bg-primary/10"
            )}
          >
            <span
              className={cn(
                "tech-value block text-[11px] tracking-[0.1em]",
                colorMode === option.id ? "text-primary" : "text-foreground"
              )}
            >
              {COLOR_MODE_LABELS[option.id]}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </ControlGroup>
  );
}
