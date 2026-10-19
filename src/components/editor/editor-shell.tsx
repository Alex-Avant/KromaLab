"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";
import { fileToBitmaps } from "@/lib/halftone/load-image";
import {
  createHalftoneClient,
  type HalftoneClientLike,
} from "@/lib/halftone/worker-client";
import type {
  ExportFormat,
  ExportScale,
  HalftoneSettings,
} from "@/lib/halftone/types";
import { ControlPanel } from "@/components/editor/control-panel";
import { PresetsPanel } from "@/components/editor/presets-panel";
import { ImageToolbar } from "@/components/editor/image-toolbar";
import {
  PreviewCanvas,
  type PreviewCanvasHandle,
} from "@/components/editor/preview-canvas";
import { ExportModal } from "@/components/editor/export-modal";
import { Histogram } from "@/components/editor/histogram";
import { HudBar } from "@/components/editor/hud-bar";

/**
 * Shell del editor: orquesta el ciclo de vida del motor de semitonos.
 *
 * - El worker (o el fallback inline) se crea de forma perezosa en la
 *   PRIMERA interacción con una imagen, nunca al cargar la página.
 * - La imagen original se transfiere al motor sin copia y nunca entra
 *   en React ni se sube a ningún servidor.
 * - Los ajustes fluyen del store al motor con coalescing por rAF:
 *   arrastrar el slider produce un render por frame, no una cola.
 * - ⌘E abre la exportación; la película se calcula en el motor.
 */
type MobilePanel = "controls" | "presets" | null;

export function EditorShell() {
  const clientRef = React.useRef<HalftoneClientLike | null>(null);
  const previewRef = React.useRef<PreviewCanvasHandle>(null);
  const noticeTimer = React.useRef<number | undefined>(undefined);

  const settings = useEditorStore((s) => s.settings);
  const image = useEditorStore((s) => s.image);
  const setImage = useEditorStore((s) => s.setImage);
  const setStats = useEditorStore((s) => s.setStats);
  const setHistogram = useEditorStore((s) => s.setHistogram);
  const setNotice = useEditorStore((s) => s.setNotice);
  const setError = useEditorStore((s) => s.setError);
  const resetSettings = useEditorStore((s) => s.resetSettings);
  const resetViewport = useEditorStore((s) => s.resetViewport);
  const setSplit = useEditorStore((s) => s.setSplit);
  const setExportOpen = useEditorStore((s) => s.setExportOpen);
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>("controls");

  const showNotice = React.useCallback(
    (text: string) => {
      setNotice(text);
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
    },
    [setNotice]
  );

  const ensureClient = React.useCallback((): HalftoneClientLike | null => {
    if (clientRef.current) return clientRef.current;
    try {
      const client = createHalftoneClient();
      client.onReady = (api) => setStats({ ready: true, api });
      client.onFrame = (frame) => {
        setStats({ renderMs: frame.renderMs });
        previewRef.current?.drawFrame(frame);
      };
      client.onHistogram = (bins) => setHistogram(bins);
      client.onError = (message) => setError(message);
      setStats({ engine: client.kind, api: "none", renderMs: 0 });
      clientRef.current = client;
      return client;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "El motor de trama no arrancó."
      );
      return null;
    }
  }, [setStats, setHistogram, setError]);

  const loadFiles = React.useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setStats({ ready: false, renderMs: 0 });
      try {
        const loaded = await fileToBitmaps(file);
        const client = ensureClient();
        if (!client) {
          loaded.bitmap.close();
          loaded.original.close();
          return;
        }
        setImage({
          name: loaded.name,
          width: loaded.width,
          height: loaded.height,
          resized: loaded.resized,
        });
        resetViewport();
        setSplit({ enabled: false, fraction: 0.5 });
        previewRef.current?.setOriginal(loaded.original);
        client.init(loaded.bitmap, loaded.width, loaded.height);
        // Sin esto, el primer frame nunca se renderiza: los ajustes solo
        // se envían al motor cuando cambian.
        client.update(useEditorStore.getState().settings);
        if (loaded.resized) {
          showNotice(
            "Muestra fuera de límite: redimensionada a 4096 px (límite del laboratorio)."
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo leer la imagen. Formatos soportados: PNG, JPG, WebP."
        );
      }
    },
    [ensureClient, setImage, setStats, setError, showNotice, resetViewport, setSplit]
  );

  // Pegado desde portapapeles (Ctrl+V / ⌘V).
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void loadFiles([file]);
            return;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [loadFiles]);

  // Atajo ⌘E / Ctrl+E — modal de exportación.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        if (useEditorStore.getState().image) {
          e.preventDefault();
          setExportOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setExportOpen]);

  // Sincronización de ajustes → motor (coalescing por rAF en el cliente).
  React.useEffect(() => {
    clientRef.current?.update(settings);
  }, [settings]);

  // Alta del motor.
  React.useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimer.current);
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const runExport = React.useCallback(
    async (
      s: HalftoneSettings,
      format: ExportFormat,
      scale: ExportScale
    ): Promise<{ buffer: ArrayBuffer; width: number; height: number; mime: string }> => {
      const client = clientRef.current;
      if (!client) throw new Error("El motor no está activo.");
      return client.export(s, format, scale);
    },
    []
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-[calc(100dvh-3.5rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside
          aria-label="Controles de calibración"
          aria-hidden={mobilePanel !== "controls"}
          className={
            mobilePanel === "controls"
              ? "w-full shrink-0 border-b border-border bg-surface/40 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0"
              : "hidden lg:block lg:w-72 lg:max-h-none lg:shrink-0 lg:border-r lg:border-b-0 lg:bg-surface/40"
          }
        >
          <ControlPanel />
        </aside>

        <section className="flex min-h-[32rem] min-w-0 flex-1 flex-col lg:min-h-0">
          <ImageToolbar
            onReset={resetSettings}
            onFiles={(files) => void loadFiles(files)}
            onExport={() => setExportOpen(true)}
          />
          <div className="dot-grid relative min-h-[24rem] flex-1 bg-background lg:min-h-0">
            <PreviewCanvas
              ref={previewRef}
              onFiles={(files) => void loadFiles(files)}
            />
          </div>
          <Histogram />
          <div className="flex shrink-0 border-t border-border bg-surface/40 lg:hidden">
            <PanelToggle
              id="controls"
              label="CALIBRACIÓN"
              active={mobilePanel === "controls"}
              onToggle={(id) => setMobilePanel((p) => (p === id ? null : id))}
            />
            <PanelToggle
              id="presets"
              label="FÓRMULAS"
              active={mobilePanel === "presets"}
              onToggle={(id) => setMobilePanel((p) => (p === id ? null : id))}
            />
          </div>
        </section>

        <aside
          aria-label="Fórmulas de trama"
          aria-hidden={mobilePanel !== "presets"}
          className={
            mobilePanel === "presets"
              ? "w-full shrink-0 border-t border-border bg-surface/40 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l"
              : "hidden lg:block lg:w-72 lg:max-h-none lg:shrink-0 lg:border-t-0 lg:border-l lg:bg-surface/40"
          }
        >
          <PresetsPanel />
        </aside>
      </div>
      <HudBar />
      {image && <ExportModal runner={runExport} />}
    </div>
  );
}

function PanelToggle({
  id,
  label,
  active,
  onToggle,
}: {
  id: NonNullable<MobilePanel>;
  label: string;
  active: boolean;
  onToggle: (id: NonNullable<MobilePanel>) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={`tech-value flex-1 px-3 py-2 text-[10px] tracking-[0.18em] transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
