import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { CmykBars } from "@/components/site/cmyk-bars";
import { RegistrationMark } from "@/components/site/registration-mark";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Semitonos para DTF: valores de referencia",
  description:
    "Guía de calibración de tramas de semitono para impresión DTF: LPI recomendado por tipo de prenda, ángulos de trama, forma de punto y diagnóstico de errores comunes.",
};

const lpiTable = [
  {
    prenda: "Algodón estándar (camisetas 150–180 g)",
    lpi: "45–55",
    notas: "Equilibrio entre detalle y apertura de punto. El default del laboratorio (55 LPI) funciona aquí.",
  },
  {
    prenda: "Poliéster deportivo",
    lpi: "55–65",
    notas: "Tejido cerrado: admite trama fina. Evita bajar de 55 LPI o los puntos se leerán individualmente.",
  },
  {
    prenda: "Bolsas de tela / tote bags",
    lpi: "35–45",
    notas: "Tejido grueso e irregular. Trama más abierta para evitar que la tinta se cierre.",
  },
  {
    prenda: "Prendas gruesas (sudaderas, felpa)",
    lpi: "30–45",
    notas: "El pelo de la felpa rompe puntos pequeños. Usa trama gruesa y aumenta el umbral mínimo.",
  },
  {
    prenda: "Detalles finos / texto pequeño",
    lpi: "60–75",
    notas: "Solo en tejido cerrado y con tinta blanca bien curada. Riesgo de reventado si el RIP resuelve poco.",
  },
] as const;

const angleRows = [
  { angulo: "45°", uso: "Trama estándar DTF", nota: "El ángulo por defecto. Máscara de moiré natural sobre tejido horizontal." },
  { angulo: "15°", uso: "Detalle fino y tipografías", nota: "Punto en cadena que preserva trazos curvos con menos diente de sierra." },
  { angulo: "75°", uso: "Tejidos diagonales (twills, jacquards)", nota: "Compensa la dirección del tejido para reducir interferencia visual." },
] as const;

const errors = [
  {
    name: "Moiré",
    desc: "Patrón de interferencia entre la trama y el tejido de la prenda.",
    fix: "Cambia el ángulo (de 45° a 15° o 75°) o sube el LPI hasta que la interferencia desaparezca.",
  },
  {
    name: "Puntos que se cierran",
    desc: "Las sombras salen como manchas negras: la tinta rellena los espacios entre puntos.",
    fix: "Reduce el LPI, baja el contraste o aplica umbral mínimo para recortar la cobertura máxima.",
  },
  {
    name: "Altas luces que se pierden",
    desc: "Las zonas claras quedan sin tinta y el detalle desaparece en la prenda.",
    fix: "Sube la gamma o reduce el umbral mínimo para mantener puntos de anclaje en las luces.",
  },
  {
    name: "Bordes aserrados en curvas",
    desc: "Diente de sierra visible en trazos y tipografía pequeña.",
    fix: "Usa forma de punto elipse o línea a 15°, o sube la resolución de exportación (2× o 4×).",
  },
  {
    name: "Tinta blanca desalineada",
    desc: "El canal blanco no coincide con la trama de color en la estampación.",
    fix: "Exporta el canal de tinta blanca como TIFF 1-bit con el mismo ángulo y LPI que la trama de color.",
  },
] as const;

function GuideSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <section className="border-b border-border py-10 lg:py-14">
        <p className="flex items-center gap-2.5">
          <span className="size-2 bg-primary" aria-hidden="true" />
          <span className="tech-value text-[11px] tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </span>
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function SemitonosDtfGuidePage() {
  return (
    <>
      {/* Encabezado */}
      <header className="relative border-b border-border">
        <RegistrationMark className="absolute top-4 right-4 text-muted-foreground/40" />
        <div className="mx-auto w-full max-w-4xl px-6 py-14 lg:py-20">
          <p className="flex items-center gap-2.5">
            <span className="size-2 bg-primary" aria-hidden="true" />
            <span className="tech-value text-[11px] tracking-[0.24em] text-muted-foreground">
              DOC·01 — GUÍA DE CALIBRACIÓN
            </span>
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl">
            Semitonos para DTF: valores de referencia
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            La trama de semitono convierte la imagen en puntos de tinta que la
            prenda puede absorber sin cerrarse. Esta guía fija los valores de
            partida — LPI por tipo de prenda, ángulos de trama y forma de punto —
            y documenta los errores más comunes con su corrección.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
            <span className="tech-value text-[11px] tracking-[0.14em] text-muted-foreground">
              LECTURA: 6 MIN
            </span>
            <span className="tech-value text-[11px] tracking-[0.14em] text-muted-foreground">
              ÁMBITO: PRODUCCIÓN DTF
            </span>
            <span className="tech-value text-[11px] tracking-[0.14em] text-muted-foreground">
              REV: 1.0
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6">
        <GuideSection eyebrow="PRINCIPIO" title="Qué hace la trama en DTF">
          <p>
            En DTF la película lleva dos capas: la trama de color y la base de
            tinta blanca. La trama fragmenta la imagen en puntos de diámetro
            variable — modulación de amplitud — para que la tinta blanca forme
            una base continua debajo del color sin saturar el tejido.
          </p>
          <p>
            Tres parámetros gobiernan el resultado: la frecuencia de trama
            (LPI, líneas por pulgada), el ángulo de la rejilla y la forma del
            punto. Ajustarlos mal produce moiré, puntos cerrados o pérdida de
            detalle en las luces.
          </p>
        </GuideSection>

        <GuideSection eyebrow="LPI" title="Frecuencia de trama por tipo de prenda">
          <p>
            El LPI define cuántas células de trama hay por pulgada lineal. Más
            LPI = más detalle y menos cobertura por punto; menos LPI = puntos
            grandes, trama visible y mayor tolerancia en tejidos gruesos. La
            tabla siguiente son valores de partida, no leyes: calibra con una
            muestra física antes de producción.
          </p>
          <div className="mt-6 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    PRENDA
                  </th>
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    LPI RECOMENDADO
                  </th>
                  <th scope="col" className="tech-value px-4 py-2.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    NOTAS DE CALIBRACIÓN
                  </th>
                </tr>
              </thead>
              <tbody>
                {lpiTable.map((row) => (
                  <tr key={row.prenda} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.prenda}</td>
                    <td className="tech-value px-4 py-3 text-sm text-primary">{row.lpi}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.notas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GuideSection>

        <GuideSection eyebrow="ÁNGULO" title="Ángulos de trama">
          <p>
            El ángulo rota la rejilla de puntos. En DTF el ángulo por defecto
            es 45°; se cambia cuando el tejido o el diseño generan
            interferencia. El laboratorio marca snaps visuales en 15°, 45° y
            75° por ser los ángulos de trabajo estándar.
          </p>
          <div className="mt-6 space-y-3">
            {angleRows.map((row) => (
              <div key={row.angulo} className="flex flex-col gap-1 rounded-md border border-border bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="tech-value w-12 shrink-0 text-base text-primary">{row.angulo}</span>
                <span className="text-sm font-medium text-foreground">{row.uso}</span>
                <span className="text-sm text-muted-foreground">{row.nota}</span>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection eyebrow="FORMA DE PUNTO" title="Elegir la forma del punto">
          <ul className="space-y-3">
            <li>
              <span className="tech-value text-sm text-primary">REDONDO — </span>
              <span>la forma estándar DTF. Comportamiento predecible en todos los LPI.</span>
            </li>
            <li>
              <span className="tech-value text-sm text-primary">ELIPSE — </span>
              <span>punto en cadena que sigue el ángulo; suaviza curvas y reduce el salto tonal en gamas medias.</span>
            </li>
            <li>
              <span className="tech-value text-sm text-primary">DIAMANTE — </span>
              <span>más área de contacto por punto; útil en tejidos absorbentes con trama gruesa.</span>
            </li>
            <li>
              <span className="tech-value text-sm text-primary">LÍNEA — </span>
              <span>trama lineal de aspecto serigráfico; para efectos editoriales, no para base blanca general.</span>
            </li>
          </ul>
        </GuideSection>

        <GuideSection eyebrow="DIAGNÓSTICO" title="Errores comunes y su corrección">
          <div className="mt-6 space-y-3">
            {errors.map((err) => (
              <div key={err.name} className="rounded-md border border-border bg-surface px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-foreground">{err.name}</h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{err.desc}</p>
                <p className="mt-1.5 text-sm text-foreground">
                  <span className="tech-value text-[10px] tracking-[0.16em] text-primary">CORRECCIÓN — </span>
                  {err.fix}
                </p>
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection eyebrow="FLUJO" title="Ponlo en práctica">
          <ol className="list-none space-y-3">
            {[
              "Carga la imagen en el laboratorio y ajusta LPI según la prenda de la tabla.",
              "Revisa sombras con la lupa (mantén Alt): si los puntos se tocan, baja el LPI.",
              "Activa el divisor ORIGINAL / TRAMA y comprueba el detalle en luces altas.",
              "Exporta TIFF 1-bit para el canal blanco y PNG para la trama de color, al mismo LPI y ángulo.",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="tech-value mt-0.5 shrink-0 rounded-xs border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/herramientas/semitonos-dtf">
                Abrir el editor
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </GuideSection>
      </div>

      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <CmykBars labels values={["100", "100", "100", "0"]} />
      </div>
    </>
  );
}
