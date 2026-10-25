import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon, GaugeIcon, ZapIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CmykBars } from "@/components/site/cmyk-bars";
import { ScrambleText } from "@/components/home/scramble-text";
import { RasterHero } from "@/components/home/raster-hero";
import { ToolsIndex } from "@/components/home/tools-index";
import { GuidesSection } from "@/components/home/guides-section";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "KromaLab — Laboratorio de precisión para impresión digital",
  description:
    "Instrumentos de trama, color y calibración para impresión DTF. Semitonos calibrados en tiempo real, 100% en tu navegador. Ninguna imagen sale de tu dispositivo.",
};

const principles = [
  {
    icon: ShieldCheckIcon,
    tag: "PROCESO LOCAL",
    title: "Tus imágenes no viajan",
    text: "Todo el procesamiento ocurre en tu dispositivo, en un Web Worker. La imagen original nunca se sube a un servidor.",
  },
  {
    icon: ZapIcon,
    tag: "PREVIEW EN VIVO",
    title: "Sin botón de aplicar",
    text: "Cada ajuste de LPI, ángulo o curva se recalcula sobre la GPU en el mismo instante en que mueves el control.",
  },
  {
    icon: GaugeIcon,
    tag: "SALIDA DE PRODUCCIÓN",
    title: "Listo para imprimir",
    text: "Exportación en PNG con transparencia o TIFF 1-bit, dimensionada a 300 DPI con lectura del tamaño físico final.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KromaLab",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "Laboratorio de precisión para impresión digital. Generador de semitonos DTF con procesamiento 100% local.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Acceso gratuito durante el lanzamiento y exportaciones locales sin límite.",
  },
  featureList: [
    "Síntesis de semitonos DTF en tiempo real",
    "Ajuste de LPI, ángulo y forma de punto",
    "Exportación PNG con transparencia y TIFF 1-bit",
    "Procesamiento 100% local sin subida de imágenes",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="flex items-center gap-2.5">
              <span className="size-2 bg-primary" aria-hidden="true" />
              <span className="tech-value text-[11px] tracking-[0.24em] text-muted-foreground">
                LAB·01 — INSTRUMENTO DE TRAMA
              </span>
            </p>
            <ScrambleText
              as="h1"
              text="Tramas de precisión para impresión digital."
              className="mt-5 max-w-xl font-display text-[40px] leading-[1.04] font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[56px]"
            />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              KromaLab es un laboratorio de instrumentos para diseño e impresión.
              El primer módulo sintetiza semitonos DTF en tiempo real — LPI,
              ángulo, forma de punto y canal de tinta blanca — directamente en tu
              navegador. Ninguna imagen sale de tu dispositivo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/herramientas/semitonos-dtf">
                  Abrir el editor
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/guias/semitonos-para-dtf">
                  Leer la guía
                </Link>
              </Button>
            </div>
            <p className="mt-8 tech-value text-[10px] tracking-[0.22em] text-muted-foreground">
              WEBGPU · WEBGL2 · OFFSCREENCANVAS · 4096 PX
            </p>
          </div>
          <Reveal delay={0.1} y={16}>
            <RasterHero />
          </Reveal>
        </div>
      </section>

      {/* SEPARADOR CMYK */}
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <CmykBars labels values={["100", "100", "100", "0"]} />
      </div>

      {/* PRINCIPIO DE OPERACIÓN */}
      <section aria-label="Principio de operación" className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-px border border-border bg-border sm:grid-cols-3">
          {principles.map((p) => (
            <Reveal key={p.tag} className="bg-background">
              <div className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <p.icon aria-hidden="true" className="size-4 text-primary" />
                  <span className="tech-value text-[9px] tracking-[0.2em] text-muted-foreground">
                    {p.tag}
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {p.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* INSTRUMENTOS */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <ToolsIndex />
        </div>
      </section>

      {/* GUÍAS */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
          <GuidesSection />
        </div>
      </section>
    </>
  );
}
