import type {
  ExportFormat,
  ExportScale,
  HalftoneSettings,
} from "@/lib/halftone/types";

/* Mensajes hilo principal → worker */
export type WorkerInitMsg = {
  type: "init";
  bitmap: ImageBitmap;
  imageWidth: number;
  imageHeight: number;
};
export type WorkerSettingsMsg = {
  type: "settings";
  settings: HalftoneSettings;
};
export type WorkerExportMsg = {
  type: "export";
  format: ExportFormat;
  scale: ExportScale;
  settings: HalftoneSettings;
};
export type WorkerDisposeMsg = { type: "dispose" };
export type WorkerMessage =
  | WorkerInitMsg
  | WorkerSettingsMsg
  | WorkerExportMsg
  | WorkerDisposeMsg;

/* Mensajes worker → hilo principal */
export type MainReadyMsg = { type: "ready"; api: "webgpu" | "webgl2" };
export type MainFrameMsg = {
  type: "frame";
  bitmap: ImageBitmap;
  renderMs: number;
};
export type MainHistogramMsg = { type: "histogram"; bins: ArrayBuffer };
export type MainExportDoneMsg = {
  type: "export-done";
  buffer: ArrayBuffer;
  width: number;
  height: number;
  mime: string;
};
export type MainExportErrorMsg = { type: "export-error"; message: string };
export type MainErrorMsg = { type: "error"; message: string };
export type MainMessage =
  | MainReadyMsg
  | MainFrameMsg
  | MainHistogramMsg
  | MainExportDoneMsg
  | MainExportErrorMsg
  | MainErrorMsg;
