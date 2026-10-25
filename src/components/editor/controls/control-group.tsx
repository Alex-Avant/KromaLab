import type * as React from "react";

import { cn } from "@/lib/utils";

type ControlGroupProps = {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export function ControlGroup({
  label,
  value,
  hint,
  children,
  className,
}: ControlGroupProps) {
  return (
    <div className={cn("border-b border-border px-4 py-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          {label}
        </h3>
        {value && (
          <span className="tech-value text-xs text-foreground">{value}</span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}
