"use client";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ControlGroup } from "@/components/editor/controls/control-group";
import { useEditorStore } from "@/store/editor-store";
import {
  CONTRAST_MAX,
  CONTRAST_MIN,
  GAMMA_MAX,
  GAMMA_MIN,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from "@/lib/halftone/types";

type MiniSliderProps = {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onValueChange: (v: number) => void;
  ariaLabel: string;
  valuetext: string;
};

function MiniSlider({
  label,
  value,
  min,
  max,
  step,
  current,
  onValueChange,
  ariaLabel,
  valuetext,
}: MiniSliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="tech-value text-[11px] text-foreground">{value}</span>
      </div>
      <Slider
        className="mt-2"
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={([v]) => onValueChange(v)}
        aria-label={ariaLabel}
        aria-valuetext={valuetext}
      />
    </div>
  );
}

export function CurvesControl({
  variant = "advanced",
}: {
  variant?: "basic" | "advanced";
}) {
  const settings = useEditorStore((s) => s.settings);
  const setSettings = useEditorStore((s) => s.setSettings);

  return (
    <ControlGroup
      label="CURVAS"
      hint="Convierte la luminancia de la imagen en cobertura de tinta."
    >
      <div className="space-y-4">
        <MiniSlider
          label="CONTRASTE"
          value={
            settings.contrast > 0 ? `+${settings.contrast}` : `${settings.contrast}`
          }
          min={CONTRAST_MIN}
          max={CONTRAST_MAX}
          step={1}
          current={settings.contrast}
          onValueChange={(contrast) => setSettings({ contrast })}
          ariaLabel="Contraste"
          valuetext={`${settings.contrast} por ciento`}
        />

        {variant === "advanced" && (
          <>
            <MiniSlider
              label="GAMMA"
              value={settings.gamma.toFixed(2)}
              min={GAMMA_MIN}
              max={GAMMA_MAX}
              step={0.01}
              current={settings.gamma}
              onValueChange={(gamma) => setSettings({ gamma })}
              ariaLabel="Gamma"
              valuetext={`gamma ${settings.gamma.toFixed(2)}`}
            />
            <MiniSlider
              label="UMBRAL MÍNIMO"
              value={`${settings.minThreshold}%`}
              min={THRESHOLD_MIN}
              max={THRESHOLD_MAX}
              step={1}
              current={settings.minThreshold}
              onValueChange={(minThreshold) => setSettings({ minThreshold })}
              ariaLabel="Umbral mínimo de tinta"
              valuetext={`${settings.minThreshold} por ciento`}
            />
            <div className="flex items-center justify-between">
              <div>
                <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
                  INVERSIÓN
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Positivo ↔ negativo de la trama
                </p>
              </div>
              <Switch
                checked={settings.invert}
                onCheckedChange={(invert) => setSettings({ invert })}
                aria-label="Invertir trama"
              />
            </div>
          </>
        )}
      </div>
    </ControlGroup>
  );
}
