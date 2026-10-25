"use client";

import { Slider } from "@/components/ui/slider";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import {
  LPI_MAX,
  LPI_MIN,
  lpiValuetext,
} from "@/lib/halftone/types";

export function LpiControl() {
  const lpi = useEditorStore((s) => s.settings.lpi);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup
      label="FRECUENCIA DE TRAMA"
      value={`${lpi} LPI`}
      hint="Más LPI = puntos más pequeños y detalle fino. Menos LPI = trama gruesa y más cobertura."
    >
      <Slider
        min={LPI_MIN}
        max={LPI_MAX}
        step={1}
        value={[lpi]}
        onValueChange={([v]) => setSettings({ lpi: v })}
        aria-label="LPI — líneas por pulgada"
        aria-valuetext={lpiValuetext(lpi)}
      />
      <div className="mt-2 flex justify-between">
        <span className="tech-value text-[10px] text-muted-foreground">
          {LPI_MIN} · GRUESA
        </span>
        <span className="tech-value text-[10px] text-muted-foreground">
          FINA · {LPI_MAX}
        </span>
      </div>
    </ControlGroup>
  );
}
