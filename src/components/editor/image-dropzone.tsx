"use client";

import * as React from "react";
import { ImagePlusIcon, ClipboardIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  onFiles: (files: File[]) => void;
  className?: string;
};

const ACCEPTED = "image/png, image/jpeg, image/webp";

export function ImageDropzone({ onFiles, className }: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const dragDepth = React.useRef(0);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  };

  return (
    <div
      className={cn(
        "relative flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-md border border-border bg-surface px-8 py-12 text-center transition-colors duration-150",
        dragging && "border-primary bg-surface-raised",
        className
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current--;
        if (dragDepth.current <= 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <span className="grid size-12 place-items-center rounded-xs border border-border bg-surface-raised">
        <ImagePlusIcon aria-hidden="true" className="size-5 text-primary" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">
          Carga una muestra para calibrar
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastra una imagen, pégala con{" "}
          <kbd className="tech-value rounded-xs border border-border bg-surface-raised px-1.5 py-0.5 text-[11px] text-foreground">
            Ctrl+V
          </kbd>{" "}
          o selecciónala del dispositivo.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none inline-flex h-9 items-center gap-2 rounded-xs bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        <ClipboardIcon aria-hidden="true" className="size-4" />
        Seleccionar archivo
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        aria-label="Seleccionar archivo de imagen"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="tech-value text-[10px] tracking-[0.16em] text-muted-foreground">
        PNG · JPG · WEBP — MÁX 4096 PX
      </p>
    </div>
  );
}
