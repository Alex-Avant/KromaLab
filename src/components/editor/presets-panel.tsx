"use client";

import * as React from "react";
import { BookmarkPlusIcon, Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  BUILTIN_PRESETS,
  deleteCustomPreset,
  loadCustomPresets,
  saveCustomPreset,
} from "@/lib/halftone/presets";
import { useEditorStore } from "@/store/editor-store";

/**
 * Panel de fórmulas (presets). Aplicar una fórmula modifica los
 * controles; guardar la calibración actual persiste en localStorage.
 */
export function PresetsPanel() {
  const settings = useEditorStore((s) => s.settings);
  const setSettings = useEditorStore((s) => s.setSettings);
  const customPresets = useEditorStore((s) => s.customPresets);
  const setCustomPresets = useEditorStore((s) => s.setCustomPresets);
  const [name, setName] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, [setCustomPresets]);

  const save = () => {
    const next = saveCustomPreset(name, settings);
    setCustomPresets(next);
    setName("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          FÓRMULAS
        </span>
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      </div>

      <div className="space-y-1.5 px-4 py-4">
        <p className="tech-value text-[9px] tracking-[0.2em] text-muted-foreground">
          DE FÁBRICA
        </p>
        {BUILTIN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSettings(preset.settings)}
            className="group w-full rounded-xs border border-border bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-raised"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-display text-sm font-semibold text-foreground group-hover:text-primary">
                {preset.name}
              </span>
              {preset.tag && (
                <span className="tech-value shrink-0 text-[8px] tracking-[0.16em] text-muted-foreground">
                  {preset.tag}
                </span>
              )}
            </span>
            <span className="tech-value mt-1 block text-[10px] text-muted-foreground">
              {preset.settings.lpi !== undefined
                ? `${preset.settings.lpi} LPI · ${preset.settings.angle ?? "—"}°`
                : "AJUSTES PARCIALES"}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-border px-4 py-4">
        <p className="tech-value text-[9px] tracking-[0.2em] text-muted-foreground">
          FÓRMULA PROPIA
        </p>
        {customPresets.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {customPresets.map((preset) => (
              <li key={preset.id} className="group flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => setSettings(preset.settings)}
                  className="flex-1 rounded-xs border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-raised"
                >
                  <span className="block truncate text-sm text-foreground">
                    {preset.name}
                  </span>
                  <span className="tech-value block text-[10px] text-muted-foreground">
                    {preset.settings.lpi} LPI · {preset.settings.angle}°
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar fórmula ${preset.name}`}
                  onClick={() => setCustomPresets(deleteCustomPreset(preset.id))}
                  className="grid w-9 place-items-center rounded-xs border border-border text-muted-foreground transition-colors hover:border-warning/50 hover:text-warning"
                >
                  <Trash2Icon aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) save();
            }}
            placeholder="Nombre de la fórmula…"
            maxLength={40}
            aria-label="Nombre de la fórmula propia"
            className="min-w-0 flex-1 rounded-xs border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            aria-label="Guardar fórmula propia"
            className={cn(
              "grid size-9 place-items-center rounded-xs border transition-colors",
              name.trim()
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "cursor-not-allowed border-border text-muted-foreground/50"
            )}
          >
            <BookmarkPlusIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p
          aria-live="polite"
          className={cn(
            "tech-value mt-2 text-[9px] tracking-[0.14em] text-primary transition-opacity",
            saved ? "opacity-100" : "opacity-0"
          )}
        >
          FÓRMULA GUARDADA EN ESTE DISPOSITIVO
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          La fórmula incluye LPI, ángulo, forma de punto, curvas, modo y vista
          de prueba. Se guarda localmente, nunca en un servidor.
        </p>
      </div>
    </div>
  );
}
