"use client";

import { Slider } from "@/components/ui/slider";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import {
  ANGLE_MAX,
  ANGLE_MIN,
  ANGLE_SNAPS,
  angleValuetext,
} from "@/lib/halftone/types";

export function AngleControl() {
  const angle = useEditorStore((s) => s.settings.angle);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup
      label="ÁNGULO DE TRAMA"
      value={`${angle}°`}
      hint="Rota la rejilla de puntos. 45° es el ángulo estándar para DTF."
    >
      <Slider
        min={ANGLE_MIN}
        max={ANGLE_MAX}
        step={1}
        value={[angle]}
        onValueChange={([v]) => setSettings({ angle: v })}
        aria-label="Ángulo de trama"
        aria-valuetext={angleValuetext(angle)}
      />
      {/* Snap visual en 15/45/75 */}
      <div className="relative mt-2 h-3" aria-hidden="true">
        {ANGLE_SNAPS.map((snap) => (
          <span
            key={snap}
            className="absolute -translate-x-1/2"
            style={{ left: `${((snap - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)) * 100}%` }}
          >
            <span className="block h-2 w-px bg-muted-foreground/60" />
            <span className="tech-value block text-[9px] text-muted-foreground">
              {snap}
            </span>
          </span>
        ))}
      </div>
    </ControlGroup>
  );
}
