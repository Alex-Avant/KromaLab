import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { RegistrationMark } from "@/components/site/registration-mark";
import { CmykBars } from "@/components/site/cmyk-bars";

type ModulePlaceholderProps = {
  code: string;
  title: string;
  status: string;
  phase: string;
  description: string;
};

export function ModulePlaceholder({
  code,
  title,
  status,
  phase,
  description,
}: ModulePlaceholderProps) {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-20">
      <RegistrationMark className="absolute top-6 left-6 text-muted-foreground/40" />
      <RegistrationMark className="absolute top-6 right-6 text-muted-foreground/40" />
      <RegistrationMark className="absolute bottom-6 left-6 text-muted-foreground/40" />
      <RegistrationMark className="absolute bottom-6 right-6 text-muted-foreground/40" />

      <div className="w-full max-w-xl">
        <p className="flex items-center gap-2.5">
          <span className="size-2 bg-warning" aria-hidden="true" />
          <span className="tech-value text-[11px] tracking-[0.24em] text-muted-foreground">
            {code}
          </span>
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xs border border-warning/40 px-2.5 py-1.5">
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-warning" />
            </span>
            <span className="tech-value text-[10px] tracking-[0.16em] text-warning">
              {status}
            </span>
          </span>
          <span className="tech-value rounded-xs border border-border px-2.5 py-1.5 text-[10px] tracking-[0.16em] text-muted-foreground">
            {phase}
          </span>
        </div>

        <div className="mt-10">
          <CmykBars labels values={["100", "100", "100", "0"]} />
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al índice del laboratorio
        </Link>
      </div>
    </section>
  );
}
