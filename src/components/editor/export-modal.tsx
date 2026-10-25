"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";
import {
  EXPORT_DPI,
  EXPORT_FORMAT_LABELS,
  EXPORT_MAX_PX,
  EXPORT_SCALES,
  physicalSizeCm,
  type ExportDiagnostics,
  type ExportFormat,
  type ExportScale,
  type HalftoneSettings,
} from "@/lib/halftone/types";

type ExportResult = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  mime: string;
  diagnostics: ExportDiagnostics;
};

export type ExportRunner = (
  settings: HalftoneSettings,
  format: ExportFormat,
  scale: ExportScale
) => Promise<ExportResult>;

/**
 * Modal de exportación (⌘E). Muestra el tamaño físico final a 300 DPI,
 * diagnostica el archivo y descarga sin límites ni paso por servidor.
 */
export function ExportModal({ runner }: { runner: ExportRunner }) {
  const open = useEditorStore((s) => s.exportOpen);
  const setOpen = useEditorStore((s) => s.setExportOpen);
  const image = useEditorStore((s) => s.image);
  const settings = useEditorStore((s) => s.settings);

  const [format, setFormat] = React.useState<ExportFormat>("png");
  const [scale, setScale] = React.useState<ExportScale>(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ExportResult | null>(null);
  const debugExport =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugExport") === "1";

  if (!image) return null;

  const outW = image.width * scale;
  const outH = image.height * scale;
  const effectiveDpi = EXPORT_DPI * scale;
  // La escala aumenta la resolución, no el tamaño físico impreso.
  const { widthCm, heightCm } = physicalSizeCm(image.width, image.height);
  const tooLarge = outW > EXPORT_MAX_PX || outH > EXPORT_MAX_PX;

  const doExport = async () => {
    if (tooLarge || busy) return;
    setBusy(true);
    setError(null);
    try {
      const exported = await runner(settings, format, scale);
      setResult(exported);
      const blob = new Blob([exported.buffer], { type: exported.mime });
      const url = URL.createObjectURL(blob);
      const ext = format === "png" ? "png" : "tif";
      const base = image.name.replace(/\.[^.]+$/, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}-kromalab-${settings.lpi}lpi-${settings.angle}deg-${scale}x.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      if (!debugExport) setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La exportación falló.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setError(null);
          setResult(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar película</DialogTitle>
          <DialogDescription>
            La síntesis se calcula a resolución completa en tu dispositivo.
            Nada se sube a un servidor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="tech-value mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
              FORMATO
            </p>
            <div role="group" aria-label="Formato de exportación" className="grid grid-cols-2 gap-1.5">
              {(Object.keys(EXPORT_FORMAT_LABELS) as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={format === f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-xs border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-raised",
                    format === f && "border-warning bg-warning/10"
                  )}
                >
                  <span
                    className={cn(
                      "tech-value block text-[11px] tracking-[0.1em]",
                      format === f ? "text-warning" : "text-foreground"
                    )}
                  >
                    {f === "png" ? "PNG" : "TIFF 1-BIT"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {f === "png"
                      ? "Transparencia, trama continua"
                      : "Film bilevel, listo para RIP"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="tech-value mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
              ESCALA
            </p>
            <div role="group" aria-label="Escala de exportación" className="grid grid-cols-3 gap-1.5">
              {EXPORT_SCALES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scale === s}
                  onClick={() => setScale(s)}
                  className={cn(
                    "rounded-xs border border-border bg-surface px-3 py-2 text-center transition-colors hover:bg-surface-raised",
                    scale === s && "border-warning bg-warning/10"
                  )}
                >
                  <span
                    className={cn(
                      "tech-value block text-xs",
                      scale === s ? "text-warning" : "text-foreground"
                    )}
                  >
                    {s}×
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xs border border-border bg-surface px-3.5 py-3">
            <div className="flex items-baseline justify-between">
              <span className="tech-value text-[10px] tracking-[0.18em] text-muted-foreground">
                TAMAÑO FINAL
              </span>
              <span className="tech-value text-xs text-foreground">
                {outW} × {outH} PX
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="tech-value text-[10px] tracking-[0.18em] text-muted-foreground">
                RESOLUCIÓN FINAL
              </span>
              <span className="tech-value text-xs text-foreground">
                {effectiveDpi} DPI
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="tech-value text-[10px] tracking-[0.18em] text-muted-foreground">
                TAMAÑO FÍSICO
              </span>
              <span className="tech-value text-xs text-foreground">
                {widthCm.toFixed(1)} × {heightCm.toFixed(1)} CM
              </span>
            </div>
          </div>

          {tooLarge && (
            <p role="alert" className="tech-value text-[10px] tracking-[0.08em] text-warning">
              EL TAMAÑO SUPERA {EXPORT_MAX_PX} PX — REDUCE LA ESCALA
            </p>
          )}
          {error && (
            <p role="alert" className="tech-value text-[10px] tracking-[0.08em] text-warning">
              {error}
            </p>
          )}

          {result && debugExport && (
            <details className="rounded-xs border border-border bg-surface px-3.5 py-2.5">
              <summary className="tech-value cursor-pointer text-[10px] tracking-[0.14em] text-muted-foreground">
                DIAGNÓSTICO DE EXPORTACIÓN
              </summary>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <dt className="text-muted-foreground">Archivo</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.width} × {result.height} PX
                </dd>
                <dt className="text-muted-foreground">MIME</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.diagnostics.mime}
                </dd>
                <dt className="text-muted-foreground">DPI</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.diagnostics.dpi}
                </dd>
                <dt className="text-muted-foreground">Tiles</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.diagnostics.tiles}
                </dd>
                <dt className="text-muted-foreground">Alfa</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.diagnostics.alpha ? "SÍ" : "NO (1-BIT)"} ·{" "}
                  {result.diagnostics.transparentPixels} px transparentes
                </dd>
                <dt className="text-muted-foreground">Tinta</dt>
                <dd className="tech-value text-right text-foreground">
                  {result.diagnostics.inkPixels} px ·{" "}
                  {(
                    (result.diagnostics.inkPixels /
                      result.diagnostics.totalPixels) *
                    100
                  ).toFixed(1)}
                  %
                </dd>
                <dt className="text-muted-foreground">Variación</dt>
                <dd className="tech-value text-right text-foreground">
                  {(result.diagnostics.alphaStdDev * 100).toFixed(1)}%
                </dd>
              </dl>
            </details>
          )}

          <Button
            onClick={() => void doExport()}
            disabled={tooLarge || busy}
            className="w-full bg-warning text-warning-foreground hover:bg-warning/85"
          >
            {busy ? (
              <span className="flex items-center gap-1" aria-label="Exportando">
                EXPORTANDO
                <span className="inline-flex gap-0.5" aria-hidden="true">
                  <span className="size-1 animate-pulse rounded-full bg-warning-foreground [animation-delay:0ms]" />
                  <span className="size-1 animate-pulse rounded-full bg-warning-foreground [animation-delay:150ms]" />
                  <span className="size-1 animate-pulse rounded-full bg-warning-foreground [animation-delay:300ms]" />
                </span>
              </span>
            ) : (
              <>
                <DownloadIcon aria-hidden="true" />
                Exportar {format === "png" ? "PNG" : "TIFF"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
