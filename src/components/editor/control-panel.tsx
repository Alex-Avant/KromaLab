"use client";

import * as React from "react";

import { LpiControl } from "@/components/editor/controls/lpi-control";
import { AngleControl } from "@/components/editor/controls/angle-control";
import { ShapeControl } from "@/components/editor/controls/shape-control";
import { CurvesControl } from "@/components/editor/controls/curves-control";
import { ModeControl } from "@/components/editor/controls/mode-control";
import { BackgroundControl } from "@/components/editor/controls/background-control";
import { PresetStrip } from "@/components/editor/preset-strip";

type Level = "basic" | "advanced";

/**
 * Controles agrupados por intención y en dos niveles:
 *  - Básico: fórmulas con miniatura, frecuencia, forma y contraste.
 *  - Avanzado: añade ángulo, curvas completas, modo de tinta y fondo.
 */
export function ControlPanel() {
  const [level, setLevel] = React.useState<Level>("basic");

  return (
    <div>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
            CALIBRACIÓN
          </span>
          <div
            role="group"
            aria-label="Nivel de controles"
            className="flex overflow-hidden rounded-xs border border-border"
          >
            {(
              [
                { id: "basic", label: "BÁSICO" },
                { id: "advanced", label: "AVANZADO" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={level === option.id}
                onClick={() => setLevel(option.id)}
                className={
                  "tech-value px-2 py-1 text-[9px] tracking-[0.14em] transition-colors " +
                  (level === option.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {level === "basic"
            ? "Elige una fórmula y ajusta lo esencial. La imagen se procesa en tu dispositivo."
            : "Todos los parámetros técnicos de la trama y de la salida DTF."}
        </p>
      </div>

      <PresetStrip />

      <LpiControl />
      <ShapeControl />
      <CurvesControl variant={level} />

      {level === "advanced" && (
        <>
          <AngleControl />
          <ModeControl />
          <BackgroundControl />
        </>
      )}

      <p className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        La exportación es una película transparente: el fondo de prueba no se
        incluye en el archivo.
      </p>
    </div>
  );
}
