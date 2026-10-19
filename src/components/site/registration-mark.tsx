import { cn } from "@/lib/utils";

export function RegistrationMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
      <path d="M12 5v14M5 12h14" strokeOpacity="0.4" />
    </svg>
  );
}
