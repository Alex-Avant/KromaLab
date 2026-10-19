"use client";

import { cn } from "@/lib/utils";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import { MODE_LABELS, type InkMode } from "@/lib/halftone/types";

const modes: {
  id: InkMode;
  description: string;
}[] = [
  {
    id: "luminance",
    description: "Trama DTF estándar: la luminancia de la imagen modula el punto.",
  },
  {
    id: "white",
    description: "Canal de tinta blanca separada, salida 1-bit con bordes duros.",
  },
];

export function ModeControl() {
  const mode = useEditorStore((s) => s.settings.mode);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup label="MODO DE TINTA">
      <div role="group" aria-label="Modo de tinta" className="space-y-1.5">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setSettings({ mode: m.id })}
            className={cn(
              "w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-raised",
              mode === m.id && "border-primary bg-primary/10"
            )}
          >
            <span
              className={cn(
                "tech-value block text-[11px] tracking-[0.14em]",
                mode === m.id ? "text-primary" : "text-foreground"
              )}
            >
              {MODE_LABELS[m.id]}
              {m.id === "luminance" && (
                <span className="text-muted-foreground"> · DEFAULT</span>
              )}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {m.description}
            </span>
          </button>
        ))}
      </div>
    </ControlGroup>
  );
}
