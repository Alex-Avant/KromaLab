"use client";

import * as React from "react";
import {
  DownloadIcon,
  ImagePlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";

import { useEditorStore } from "@/store/editor-store";

type ImageToolbarProps = {
  onReset: () => void;
  onFiles: (files: File[]) => void;
  onRemove: () => void;
  onExport: () => void;
};

export function ImageToolbar({
  onReset,
  onFiles,
  onRemove,
  onExport,
}: ImageToolbarProps) {
  const image = useEditorStore((s) => s.image);
  const notice = useEditorStore((s) => s.notice);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  return (
    <div className="relative flex h-11 shrink-0 items-center gap-3 overflow-x-auto whitespace-nowrap border-b border-border bg-background px-4 [scrollbar-width:none]">
      {notice && (
        <div
          role="status"
          className="absolute inset-x-0 top-full z-20 border-b border-warning/40 bg-surface px-4 py-2"
        >
          <p className="tech-value text-[10px] tracking-[0.08em] text-warning">
            {notice}
          </p>
        </div>
      )}
      {image ? (
        <>
          <span className="tech-value min-w-0 max-w-[16ch] truncate text-[11px] text-foreground sm:max-w-[28ch]">
            {image.name}
          </span>
          <span className="tech-value text-[10px] tracking-[0.08em] text-muted-foreground">
            {image.width} × {image.height} PX
          </span>
          {image.resized && (
            <span className="tech-value rounded-xs border border-warning/40 px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-warning">
              REDIMENSIONADA A 4096 PX
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              aria-label="Restablecer controles"
              className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <RotateCcwIcon aria-hidden="true" className="size-3.5" />
              <span className="hidden md:inline">Restablecer controles</span>
            </button>
            <button
              type="button"
              onClick={pick}
              aria-label="Cambiar imagen"
              className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-transparent px-2.5 text-xs text-foreground transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ImagePlusIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only md:not-sr-only">Cambiar imagen</span>
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Quitar imagen"
              title="Quitar imagen"
              className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:border-warning/50 hover:text-warning focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Trash2Icon aria-hidden="true" className="size-3.5" />
              <span className="sr-only md:not-sr-only">Quitar</span>
            </button>
            <button
              type="button"
              onClick={onExport}
              aria-label="Exportar película"
              title="Exportar película (⌘E)"
              className="inline-flex h-8 items-center gap-1.5 rounded-xs bg-warning px-3 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <DownloadIcon aria-hidden="true" className="size-3.5" />
              Exportar
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="tech-value text-[11px] tracking-[0.14em] text-muted-foreground">
            SIN MUESTRA — EL MOTOR DE TRAMA ESPERA EN STANDBY
          </span>
          <div className="ml-auto">
            <button
              type="button"
              onClick={pick}
              className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border bg-transparent px-2.5 text-xs text-foreground transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ImagePlusIcon aria-hidden="true" className="size-3.5" />
              Cargar imagen
            </button>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
