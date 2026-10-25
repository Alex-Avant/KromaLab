import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILTIN_PRESETS,
  resolvePresetSettings,
  type Preset,
} from "@/lib/halftone/presets";
import { useEditorStore } from "@/store/editor-store";
import { DEFAULT_SETTINGS } from "@/lib/halftone/types";

test("resolver una fórmula vacía devuelve el estado completo por defecto", () => {
  assert.deepEqual(resolvePresetSettings({}), DEFAULT_SETTINGS);
});

test("aplicar una fórmula es atómico y no hereda la fórmula anterior", () => {
  const store = useEditorStore.getState();
  store.resetSettings();
  store.setSettings({
    lpi: 100,
    angle: 80,
    shape: "line",
    mode: "white",
    invert: true,
    bg: "black",
  });

  useEditorStore.getState().applyPreset(BUILTIN_PRESETS[1]); // Vintage
  const settings = useEditorStore.getState().settings;

  assert.equal(settings.lpi, 22);
  assert.equal(settings.angle, 15);
  assert.equal(settings.contrast, -18);
  assert.equal(settings.gamma, 0.9);
  assert.equal(settings.minThreshold, 4);
  // Valores no especificados por la fórmula vuelven al default:
  assert.equal(settings.shape, "round");
  assert.equal(settings.mode, "luminance");
  assert.equal(settings.invert, false);
  // El fondo de prueba es una preferencia de vista.
  assert.equal(settings.bg, "black");
});

test("una fórmula propia que guarda el fondo sí lo aplica", () => {
  const custom: Preset = {
    id: "custom-test",
    name: "Custom",
    settings: { ...DEFAULT_SETTINGS, lpi: 90, shape: "diamond", bg: "white" },
  };
  useEditorStore.getState().applyPreset(custom);
  const settings = useEditorStore.getState().settings;
  assert.equal(settings.lpi, 90);
  assert.equal(settings.shape, "diamond");
  assert.equal(settings.bg, "white");
});

test("restablecer devuelve todos los valores documentados", () => {
  const store = useEditorStore.getState();
  store.setSettings({
    lpi: 12,
    angle: 3,
    shape: "ellipse",
    contrast: 50,
    gamma: 2.5,
    minThreshold: 70,
    invert: true,
    mode: "white",
    bg: "white",
  });
  useEditorStore.getState().resetSettings();
  assert.deepEqual(useEditorStore.getState().settings, DEFAULT_SETTINGS);
});
