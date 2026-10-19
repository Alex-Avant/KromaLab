import Link from "next/link";

import { BrandMark } from "@/components/site/brand-mark";
import { RegistrationMark } from "@/components/site/registration-mark";
import { CmykBars } from "@/components/site/cmyk-bars";
import { nav, tools, guides } from "@/lib/site";

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <RegistrationMark className="absolute top-3 left-3 text-muted-foreground/50" />
      <RegistrationMark className="absolute top-3 right-3 text-muted-foreground/50" />
      <RegistrationMark className="absolute bottom-3 left-3 text-muted-foreground/50" />
      <RegistrationMark className="absolute bottom-3 right-3 text-muted-foreground/50" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Laboratorio de precisión para impresión digital. Instrumentos de
            trama, color y calibración para producción DTF.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-xs border border-border bg-surface px-2.5 py-1.5">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="tech-value text-[10px] tracking-[0.14em] text-muted-foreground">
              PROCESAMIENTO 100% LOCAL — SIN SUBIDAS
            </span>
          </p>
        </div>

        <div>
          <h2 className="tech-value text-[11px] tracking-[0.22em] text-muted-foreground">
            NAVEGACIÓN
          </h2>
          <ul className="mt-4 space-y-2.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="tech-value text-[11px] tracking-[0.22em] text-muted-foreground">
            INSTRUMENTOS
          </h2>
          <ul className="mt-4 space-y-2.5">
            {tools.map((tool) => (
              <li key={tool.id}>
                {tool.href ? (
                  <Link
                    href={tool.href}
                    className="text-sm text-foreground transition-colors hover:text-primary"
                  >
                    {tool.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {tool.name}
                  </span>
                )}
              </li>
            ))}
            <li>
              {guides[0].href ? (
                <Link
                  href={guides[0].href}
                  className="text-sm text-foreground transition-colors hover:text-primary"
                >
                  {guides[0].title}
                </Link>
              ) : null}
            </li>
          </ul>
        </div>

        <div>
          <h2 className="tech-value text-[11px] tracking-[0.22em] text-muted-foreground">
            ESPECIFICACIÓN TÉCNICA
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              Motor: <span className="tech-value text-foreground">WebGPU / WebGL2</span>
            </li>
            <li>
              Ejecución: <span className="tech-value text-foreground">Web Worker</span>
            </li>
            <li>
              Límite de entrada: <span className="tech-value text-foreground">4096 px</span>
            </li>
            <li>
              Salida: <span className="tech-value text-foreground">PNG · TIFF 1-bit</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-10">
        <CmykBars />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="tech-value text-[11px] tracking-[0.12em] text-muted-foreground">
            © 2026 KROMALAB — LABORATORIO DE IMPRESIÓN DIGITAL
          </p>
          <p className="tech-value text-[11px] tracking-[0.12em] text-muted-foreground">
            BUILD 0.1.0 · FASE A
          </p>
        </div>
      </div>
    </footer>
  );
}
