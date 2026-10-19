import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { tools, statusLabel } from "@/lib/site";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/section-heading";

const statusClass: Record<string, string> = {
  operativo: "border-primary/40 text-primary",
  calibracion: "border-border text-muted-foreground",
  redaccion: "border-border text-muted-foreground",
};

export function ToolsIndex() {
  return (
    <section id="instrumentos" className="scroll-mt-20">
      <Reveal>
        <SectionHeading
          eyebrow="INSTRUMENTOS"
          title="Módulos del laboratorio"
          description="Herramientas de producción calibradas para flujo DTF. Cada módulo procesa en local: ninguna imagen sale de tu dispositivo."
        />
      </Reveal>

      <Reveal delay={0.06}>
        <ul className="mt-8 border-t border-border">
          {tools.map((tool) => {
            const live = tool.status === "operativo";
            const inner = (
              <span
                className={cn(
                  "relative grid w-full items-center gap-x-6 gap-y-2 py-5 grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto_1.5rem] lg:grid-cols-[3rem_1.4fr_auto_8rem_1.5rem]",
                  live && "pr-1"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                    live ? "dot-grid-cyan" : "dot-grid"
                  )}
                />
                <span className="tech-value relative text-sm text-muted-foreground">
                  {tool.index}
                </span>
                <span className="relative">
                  <span className="block font-display text-xl font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
                    {tool.name}
                  </span>
                  <span className="mt-1 block max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
                <span className="tech-value relative hidden text-xs text-muted-foreground lg:block">
                  {tool.spec}
                </span>
                <span
                  className={cn(
                    "relative inline-flex w-fit items-center rounded-xs border px-2 py-1 tech-value text-[10px] tracking-[0.14em]",
                    statusClass[tool.status]
                  )}
                >
                  {statusLabel[tool.status]}
                </span>
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className={cn(
                    "relative size-4 text-muted-foreground transition-all duration-150",
                    live && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  )}
                />
              </span>
            );

            return (
              <li
                key={tool.id}
                className={cn(
                  "group relative border-b border-border transition-colors duration-150",
                  live && "hover:bg-surface/60"
                )}
              >
                {live && tool.href ? (
                  <Link
                    href={tool.href}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    aria-label={`Abrir ${tool.name}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div aria-disabled="true">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
