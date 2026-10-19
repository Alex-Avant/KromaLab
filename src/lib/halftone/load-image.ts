import { fitWithin } from "@/lib/halftone/types";

const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

export type LoadedImage = {
  bitmap: ImageBitmap;
  name: string;
  width: number;
  height: number;
  resized: boolean;
};

export type LoadedImagePair = LoadedImage & {
  /** Segunda copia para la vista ORIGINAL del divisor (nunca se transfiere). */
  original: ImageBitmap;
};

async function decodeOnce(file: File, width: number, height: number): Promise<ImageBitmap> {
  return createImageBitmap(file, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
}

/**
 * Decodifica el archivo fuera del hilo principal (createImageBitmap)
 * y lo redimensiona al límite del laboratorio (4096 px) si es necesario.
 * Devuelve dos bitmaps independientes: uno para el motor (se transfiere
 * al worker) y otro para la vista ORIGINAL del divisor.
 */
export async function fileToBitmaps(file: File): Promise<LoadedImagePair> {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error(
      `Formato no soportado: ${file.type || "desconocido"}. Usa PNG, JPG o WebP.`
    );
  }

  const probe = await createImageBitmap(file);
  const { width, height, resized } = fitWithin(probe.width, probe.height);
  probe.close();

  const engine = await decodeOnce(file, width, height);
  const original = await decodeOnce(file, width, height);

  return { bitmap: engine, original, name: file.name, width, height, resized };
}
