"use client";

import { create } from "zustand";

import {
  DEFAULT_SETTINGS,
  type HalftoneSettings,
} from "@/lib/halftone/types";
import {
  resolvePresetSettings,
  type Preset,
} from "@/lib/halftone/presets";

export type ImageMeta = {
  name: string;
  width: number;
  height: number;
  resized: boolean;
  /** Object URL del archivo original (vista ORIGINAL y placeholder). */
  url: string;
};

type EditorStats = {
  engine: "worker" | "inline" | "none";
  api: "webgpu" | "webgl2" | "none";
  renderMs: number;
  frames: number;
  ready: boolean;
};

export type ViewportState = {
  /** Zoom en % del tamaño ajustado a pantalla (10–400). */
  zoom: number;
  panX: number;
  panY: number;
};

export type SplitState = {
  enabled: boolean;
  /** Posición del divisor como fracción del ancho (0–1). */
  fraction: number;
};

type EditorState = {
  image: ImageMeta | null;
  settings: HalftoneSettings;
  stats: EditorStats;
  histogram: Uint32Array | null;
  notice: string | null;
  error: string | null;

  viewport: ViewportState;
  split: SplitState;
  customPresets: Preset[];
  exportOpen: boolean;

  setImage: (image: ImageMeta | null) => void;
  setSettings: (patch: Partial<HalftoneSettings>) => void;
  applyPreset: (preset: Preset) => void;
  resetSettings: () => void;
  setStats: (patch: Partial<EditorStats>) => void;
  setHistogram: (bins: Uint32Array | null) => void;
  setNotice: (notice: string | null) => void;
  setError: (error: string | null) => void;

  setViewport: (patch: Partial<ViewportState>) => void;
  resetViewport: () => void;
  setSplit: (patch: Partial<SplitState>) => void;
  setCustomPresets: (presets: Preset[]) => void;
  setExportOpen: (open: boolean) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  image: null,
  settings: DEFAULT_SETTINGS,
  stats: { engine: "none", api: "none", renderMs: 0, frames: 0, ready: false },
  histogram: null,
  notice: null,
  error: null,

  viewport: { zoom: 100, panX: 0, panY: 0 },
  split: { enabled: false, fraction: 0.5 },
  customPresets: [],
  exportOpen: false,

  setImage: (image) => set({ image }),
  setSettings: (patch) =>
    set((s) => ({ settings: { ...s.settings, ...patch } })),
  applyPreset: (preset) =>
    set((s) => {
      const resolved = resolvePresetSettings(preset.settings);
      // Fondo y modo de color son preferencias del usuario: solo se
      // aplican si la fórmula los guardó explícitamente.
      return {
        settings: {
          ...resolved,
          bg: preset.settings.bg ?? s.settings.bg,
          colorMode: preset.settings.colorMode ?? s.settings.colorMode,
        },
      };
    }),
  resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
  setStats: (patch) => set((s) => ({ stats: { ...s.stats, ...patch } })),
  setHistogram: (histogram) => set({ histogram }),
  setNotice: (notice) => set({ notice }),
  setError: (error) => set({ error }),

  setViewport: (patch) =>
    set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  resetViewport: () => set({ viewport: { zoom: 100, panX: 0, panY: 0 } }),
  setSplit: (patch) => set((s) => ({ split: { ...s.split, ...patch } })),
  setCustomPresets: (customPresets) => set({ customPresets }),
  setExportOpen: (exportOpen) => set({ exportOpen }),
}));
