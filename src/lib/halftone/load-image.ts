import { fitWithin } from "@/lib/halftone/types";

const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

export type LoadedImage = {
  bitmap: ImageBitmap;
  name: string;
  width: number;
  height: number;
  resized: boolean;
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
 * La vista ORIGINAL usa el propio archivo vía object URL; aquí solo se
 * prepara el bitmap que se transfiere al motor.
 */
export async function fileToBitmaps(file: File): Promise<LoadedImage> {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error(
      `Formato no soportado: ${file.type || "desconocido"}. Usa PNG, JPG o WebP.`
    );
  }

  const probe = await createImageBitmap(file);
  const { width, height, resized } = fitWithin(probe.width, probe.height);
  probe.close();

  const bitmap = await decodeOnce(file, width, height);

  return { bitmap, name: file.name, width, height, resized };
}
