"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";
import { fileToBitmaps } from "@/lib/halftone/load-image";
import { frameHasContent } from "@/lib/halftone/frame-check";
import {
  createHalftoneClient,
  InlineHalftoneClient,
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
  const fileRef = React.useRef<File | null>(null);
  const imageUrlRef = React.useRef<string | null>(null);
  const frameCountRef = React.useRef(0);
  const retriedRef = React.useRef(false);
  const watchdogRef = React.useRef<number | undefined>(undefined);
  const retryRef = React.useRef<(() => void) | null>(null);

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
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>(null);

  const showNotice = React.useCallback(
    (text: string) => {
      setNotice(text);
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setNotice(null), 6000);
    },
    [setNotice]
  );

  const clearWatchdog = React.useCallback(() => {
    window.clearTimeout(watchdogRef.current);
    watchdogRef.current = undefined;
  }, []);

  /** Object URL del archivo (la vista ORIGINAL no depende de la GPU). */
  const makeImageUrl = React.useCallback((file: File) => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;
    return url;
  }, []);

  const createClient = React.useCallback(
    (forceWebGL2: boolean): HalftoneClientLike | null => {
      try {
        const client = forceWebGL2
          ? new InlineHalftoneClient({ forceWebGL2: true })
          : createHalftoneClient();
        client.onReady = (api) => {
          if (clientRef.current !== client) return;
          setStats({ ready: true, api });
          // Reenvío defensivo: garantiza que el motor tenga ajustes aunque
          // el mensaje inicial se haya cruzado con la inicialización.
          client.update(useEditorStore.getState().settings);
        };
        client.onFrame = (frame) => {
          if (clientRef.current !== client) {
            frame.bitmap.close();
            return;
          }
          // Primer frame transparente: el driver falló en silencio. Se
          // conserva la muestra original visible y se reintenta en WebGL2.
          if (frameCountRef.current === 0 && !frameHasContent(frame.bitmap)) {
            frame.bitmap.close();
            clearWatchdog();
            if (!retriedRef.current) {
              retriedRef.current = true;
              retryRef.current?.();
            } else {
              setError(
                "El motor de trama no produjo imagen (posible driver GPU). Se muestra la muestra original; prueba otra imagen o recarga la página."
              );
            }
            return;
          }
          clearWatchdog();
          frameCountRef.current += 1;
          setStats({ renderMs: frame.renderMs, frames: frameCountRef.current });
          previewRef.current?.drawFrame(frame);
        };
        client.onHistogram = (bins) => setHistogram(bins);
        client.onError = (message) => {
          if (clientRef.current !== client) return;
          setError(message);
        };
        setStats({
          engine: client.kind,
          api: "none",
          renderMs: 0,
          frames: 0,
          ready: false,
        });
        clientRef.current = client;
        return client;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "El motor de trama no arrancó."
        );
        return null;
      }
    },
    [clearWatchdog, setStats, setHistogram, setError]
  );

  /**
   * Reintento defensivo en el hilo principal con WebGL2 forzado: cubre
   * navegadores donde WebGPU existe pero se queda colgado o produce
   * frames vacíos sin lanzar error.
   */
  const retryWithWebGL2 = React.useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;
    clearWatchdog();
    clientRef.current?.dispose();
    clientRef.current = null;
    try {
      const loaded = await fileToBitmaps(file);
      const client = createClient(true);
      if (!client) {
        loaded.bitmap.close();
        return;
      }
      client.init(loaded.bitmap, loaded.width, loaded.height);
      client.update(useEditorStore.getState().settings);
      showNotice("El motor GPU no produjo imagen: reintentando en WebGL2.");
      watchdogRef.current = window.setTimeout(() => {
        if (frameCountRef.current === 0) {
          setError(
            "El motor de trama no emitió ningún frame. Prueba otra imagen o recarga la página."
          );
        }
      }, 6000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo reintentar el motor en WebGL2."
      );
    }
  }, [clearWatchdog, createClient, setError, showNotice]);

  React.useEffect(() => {
    retryRef.current = () => void retryWithWebGL2();
  }, [retryWithWebGL2]);

  const loadFiles = React.useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      fileRef.current = file;
      retriedRef.current = false;
      frameCountRef.current = 0;
      clearWatchdog();
      setError(null);
      setStats({ ready: false, renderMs: 0, frames: 0 });
      try {
        const loaded = await fileToBitmaps(file);
        setImage({
          name: loaded.name,
          width: loaded.width,
          height: loaded.height,
          resized: loaded.resized,
          url: makeImageUrl(file),
        });
        resetViewport();
        setSplit({ enabled: false, fraction: 0.5 });

        clientRef.current?.dispose();
        clientRef.current = null;
        const client = createClient(false);
        if (!client) {
          loaded.bitmap.close();
          return;
        }
        client.init(loaded.bitmap, loaded.width, loaded.height);
        // Sin esto, el primer frame nunca se renderiza: los ajustes solo
        // se envían al motor cuando cambian.
        client.update(useEditorStore.getState().settings);

        // Watchdog: si no llega ningún frame, reintentar una vez en el
        // hilo principal forzando WebGL2.
        watchdogRef.current = window.setTimeout(() => {
          if (frameCountRef.current > 0) return;
          if (retriedRef.current) {
            setError(
              "El motor de trama no emitió ningún frame. Prueba otra imagen o recarga la página."
            );
            return;
          }
          retriedRef.current = true;
          void retryWithWebGL2();
        }, 5000);

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
    [
      clearWatchdog,
      createClient,
      makeImageUrl,
      setImage,
      setStats,
      setError,
      showNotice,
      resetViewport,
      setSplit,
      retryWithWebGL2,
    ]
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
      window.clearTimeout(watchdogRef.current);
      clientRef.current?.dispose();
      clientRef.current = null;
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
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
          className={
            mobilePanel === "controls"
              ? "max-h-[32dvh] w-full shrink-0 overflow-y-auto border-b border-border bg-surface/40 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0"
              : "hidden lg:block lg:w-72 lg:max-h-none lg:shrink-0 lg:border-r lg:border-b-0 lg:bg-surface/40"
          }
        >
          <ControlPanel />
        </aside>

        <section className="flex min-w-0 flex-none flex-col lg:min-h-0 lg:flex-1">
          <ImageToolbar
            onReset={resetSettings}
            onFiles={(files) => void loadFiles(files)}
            onExport={() => setExportOpen(true)}
          />
          <div className="dot-grid relative h-[55dvh] min-h-[24rem] flex-none bg-background lg:h-auto lg:min-h-0 lg:flex-1">
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
          className={
            mobilePanel === "presets"
              ? "max-h-[32dvh] w-full shrink-0 overflow-y-auto border-t border-border bg-surface/40 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l"
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
