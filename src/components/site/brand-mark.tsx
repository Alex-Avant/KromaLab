import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-5 place-items-center">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="size-5"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M10 3.5v13M3.5 10h13"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2" stroke="#22D3EE" strokeWidth="1.25" />
        </svg>
      </span>
      <span className="tech-value whitespace-nowrap text-[15px] font-semibold tracking-[0.12em] text-foreground sm:tracking-[0.22em]">
        KROMA<span className="text-primary">·</span>LAB
      </span>
    </span>
  );
}
