import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, MinusIcon, ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CmykBars } from "@/components/site/cmyk-bars";
import { RegistrationMark } from "@/components/site/registration-mark";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "KromaLab Pro",
  description:
    "Funciones adicionales de KromaLab en preparación. El editor y las exportaciones locales están disponibles durante el lanzamiento.",
};

const comparison = [
  { feature: "Exportaciones locales", free: "Sin límite", pro: "Sin límite" },
  { feature: "Resolución de entrada", free: "4096 px", pro: "4096 px" },
  { feature: "Escala de exportación", free: "1× / 2× / 4×", pro: "1× / 2× / 4×" },
  { feature: "Formato TIFF 1-bit", free: true, pro: true },
  { feature: "Fórmulas propias (local)", free: true, pro: true },
  { feature: "Capa WebGPU", free: true, pro: true },
  { feature: "Sincronización de fórmulas", free: false, pro: "Próximamente" },
  { feature: "Acceso anticipado a instrumentos", free: false, pro: true },
] as const;

function Cell({ value, pro }: { value: string | boolean; pro?: boolean }) {
  if (value === true) return <CheckIcon aria-hidden="true" className="size-4 text-primary" />;
  if (value === false) return <MinusIcon aria-hidden="true" className="size-4 text-muted-foreground/50" />;
  return (
    <span className={cn("tech-value text-xs", pro ? "text-warning" : "text-foreground")}>
      {value}
    </span>
  );
}

export default function ProPage() {
  return (
    <>
      <header className="relative border-b border-border">
        <RegistrationMark className="absolute top-4 right-4 text-muted-foreground/40" />
        <div className="mx-auto w-full max-w-4xl px-6 py-14 text-center lg:py-20">
          <p className="flex items-center justify-center gap-2.5">
            <span className="size-2 bg-warning" aria-hidden="true" />
            <span className="tech-value text-[11px] tracking-[0.24em] text-muted-foreground">
              SYS·02 — PLAN PRO
            </span>
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl">
            KromaLab durante el lanzamiento
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            El editor, todos los instrumentos y las exportaciones locales están
            disponibles sin cuota. Las funciones adicionales de Pro se anunciarán
            cuando exista un método de activación.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6">
        {/* Tarjetas de plan */}
        <Reveal>
          <div className="grid gap-4 py-12 sm:grid-cols-2 lg:py-16">
            <div className="rounded-md border border-border bg-surface p-6">
              <p className="tech-value text-[11px] tracking-[0.2em] text-muted-foreground">
                GRATIS
              </p>
              <p className="mt-2 font-display text-4xl font-semibold text-foreground">
                0 €
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Para calibrar y producir durante el lanzamiento.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                  Exportaciones locales sin límite
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                  Todos los instrumentos y fórmulas
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                  Procesamiento 100% local
                </li>
              </ul>
              <Button variant="outline" className="mt-6 w-full" asChild>
                <Link href="/herramientas/semitonos-dtf">Abrir el editor</Link>
              </Button>
            </div>

            <div className="relative rounded-md border border-warning/50 bg-surface p-6">
              <span className="tech-value absolute -top-2.5 left-5 rounded-xs bg-warning px-2 py-0.5 text-[9px] tracking-[0.16em] text-warning-foreground">
                LANZAMIENTO
              </span>
              <p className="tech-value text-[11px] tracking-[0.2em] text-warning">
                PRO
              </p>
              <p className="mt-2 font-display text-4xl font-semibold text-foreground">
                Próximamente
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Funciones adicionales en preparación.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-foreground">
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-warning" />
                  Exportaciones locales sin límite
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-warning" />
                  Sincronización de fórmulas entre dispositivos
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon aria-hidden="true" className="size-4 text-warning" />
                  Acceso anticipado a instrumentos nuevos
                </li>
              </ul>
              <Button disabled className="mt-6 w-full">
                Activación próximamente
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Comparativa */}
        <Reveal>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    CAPACIDAD
                  </th>
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    GRATIS
                  </th>
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-warning">
                    PRO
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.feature}</td>
                    <td className="px-4 py-3"><Cell value={row.free} /></td>
                    <td className="px-4 py-3"><Cell value={row.pro} pro /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Principio */}
        <Reveal>
          <div className="my-12 rounded-md border border-border bg-surface p-6 lg:my-16">
            <p className="tech-value text-[11px] tracking-[0.2em] text-muted-foreground">
              PRINCIPIO DE OPERACIÓN
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-foreground">
              Pro no cambia dónde corre tu imagen
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              La imagen original siempre se procesa en tu dispositivo y no se
              sube a ningún servidor. Las exportaciones locales no tienen un
              límite diario.
            </p>
          </div>
        </Reveal>

        {/* CTA final */}
        <Reveal>
          <div className="flex flex-col items-center gap-4 pb-14 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              Las funciones adicionales se anunciarán cuando esté disponible
              su método de activación. El editor sigue abierto para calibrar y
              exportar localmente.
            </p>
            <Button asChild>
              <Link href="/herramientas/semitonos-dtf">
                Calibrar ahora
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-6">
        <CmykBars labels values={["100", "100", "100", "0"]} />
      </div>
    </>
  );
}
