"use client";

import { LpiControl } from "@/components/editor/controls/lpi-control";
import { AngleControl } from "@/components/editor/controls/angle-control";
import { ShapeControl } from "@/components/editor/controls/shape-control";
import { CurvesControl } from "@/components/editor/controls/curves-control";
import { ModeControl } from "@/components/editor/controls/mode-control";
import { BackgroundControl } from "@/components/editor/controls/background-control";

export function ControlPanel() {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          CALIBRACIÓN
        </span>
        <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      </div>
      <LpiControl />
      <AngleControl />
      <ShapeControl />
      <CurvesControl />
      <ModeControl />
      <BackgroundControl />
    </div>
  );
}
