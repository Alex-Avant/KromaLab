"use client";

import type { HalftoneSettings } from "@/lib/halftone/types";

export type Preset = {
  id: string;
  name: string;
  tag?: string;
  settings: Partial<HalftoneSettings>;
};

/** Fórmulas de fábrica, calibradas para flujo DTF. */
export const BUILTIN_PRESETS: Preset[] = [
  {
    id: "base-blanca-suave",
    name: "Base blanca suave",
    tag: "DTF DEFAULT",
    settings: {
      lpi: 55,
      angle: 45,
      shape: "round",
      mode: "luminance",
      contrast: 0,
      gamma: 1,
      minThreshold: 0,
      invert: false,
    },
  },
  {
    id: "vintage",
    name: "Vintage",
    tag: "TRAMA GRUESA",
    settings: {
      lpi: 22,
      angle: 15,
      contrast: -18,
      gamma: 0.9,
      minThreshold: 4,
    },
  },
  {
    id: "deportiva",
    name: "Deportiva",
    tag: "TRAMA FINA",
    settings: {
      lpi: 65,
      angle: 45,
      contrast: 12,
      gamma: 1.05,
    },
  },
  {
    id: "serigrafia-cmyk",
    name: "Serigrafía CMYK",
    tag: "SIMULACIÓN",
    settings: {
      lpi: 35,
      angle: 15,
      shape: "ellipse",
      mode: "white",
      minThreshold: 8,
    },
  },
];

const STORAGE_KEY = "kromalab:presets:v1";

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadCustomPresets(): Preset[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Preset =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Preset).id === "string" &&
        typeof (p as Preset).name === "string" &&
        typeof (p as Preset).settings === "object"
    );
  } catch {
    return [];
  }
}

export function saveCustomPreset(
  name: string,
  settings: HalftoneSettings
): Preset[] {
  const storage = safeStorage();
  if (!storage) return loadCustomPresets();
  const current = loadCustomPresets();
  const preset: Preset = {
    id: `custom-${Date.now().toString(36)}`,
    name: name.trim().slice(0, 40) || "Fórmula sin nombre",
    settings,
  };
  const next = [...current, preset].slice(-12);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteCustomPreset(id: string): Preset[] {
  const storage = safeStorage();
  const next = loadCustomPresets().filter((p) => p.id !== id);
  storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
