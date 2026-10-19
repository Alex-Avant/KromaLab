import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { guides, statusLabel } from "@/lib/site";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/section-heading";

export function GuidesSection() {
  return (
    <section id="guias" className="scroll-mt-20">
      <Reveal>
        <SectionHeading
          eyebrow="DOCUMENTACIÓN"
          title="Guías de calibración"
          description="Valores de referencia para producción: LPI por prenda, ángulos de trama y diagnóstico de errores comunes."
        />
      </Reveal>

      <Reveal delay={0.06}>
        <ul className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
          {guides.map((guide) => {
            const live = Boolean(guide.href);
            return (
              <li key={guide.id} className="group relative bg-background">
                {live ? (
                  <Link
                    href={guide.href!}
                    className="relative flex h-full flex-col gap-6 p-5 transition-colors duration-150 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <GuideInner guide={guide} />
                  </Link>
                ) : (
                  <div className="relative flex h-full flex-col gap-6 p-5">
                    <GuideInner guide={guide} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}

function GuideInner({
  guide,
}: {
  guide: (typeof guides)[number];
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        <span className="tech-value text-xs text-muted-foreground">
          {guide.index}
        </span>
        <span className="tech-value rounded-xs border border-border px-2 py-1 text-[9px] tracking-[0.18em] text-muted-foreground">
          {guide.section}
        </span>
      </div>
      <div className="mt-auto space-y-3">
        <h3 className="font-display text-lg font-semibold leading-snug text-foreground transition-colors duration-150 group-hover:text-primary">
          {guide.title}
        </h3>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "tech-value text-[10px] tracking-[0.14em]",
              guide.status === "redaccion"
                ? "text-muted-foreground"
                : "text-primary"
            )}
          >
            {statusLabel[guide.status]}
          </span>
          <span className="flex items-center gap-2">
            <span className="tech-value text-xs text-muted-foreground">
              {guide.readTime}
            </span>
            {guide.href && (
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
              />
            )}
          </span>
        </div>
      </div>
    </>
  );
}
