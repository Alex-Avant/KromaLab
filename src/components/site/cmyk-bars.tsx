import { cn } from "@/lib/utils";

type CmykBarsProps = {
  className?: string;
  labels?: boolean;
  values?: [string, string, string, string];
};

const channels = [
  { label: "C", color: "#22D3EE" },
  { label: "M", color: "#F43FA0" },
  { label: "Y", color: "#FACC15" },
  { label: "K", color: "#F2F4F8" },
] as const;

export function CmykBars({ className, labels = false, values }: CmykBarsProps) {
  return (
    <div
      className={cn("flex w-full gap-px", className)}
      role="presentation"
      aria-hidden={!labels}
    >
      {channels.map((ch, i) => (
        <div key={ch.label} className="flex-1">
          <div
            className="h-[3px] w-full"
            style={{ backgroundColor: ch.color }}
          />
          {labels && (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="tech-value text-[9px] tracking-[0.18em] text-muted-foreground">
                {ch.label}
              </span>
              {values && (
                <span className="tech-value text-[9px] text-muted-foreground">
                  {values[i]}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
