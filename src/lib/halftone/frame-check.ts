/* ------------------------------------------------------------------ */
/* Diagnóstico de frames del motor.                                    */
/*                                                                     */
/* Algunos drivers (WebGPU en Android, SwiftShader/headless) generan   */
/* ImageBitmaps completamente transparentes sin lanzar ningún error.   */
/* Se muestrea el frame a 48×48: si no hay ningún píxel con alfa, se   */
/* considera vacío y el editor conserva la imagen original visible.    */
/* ------------------------------------------------------------------ */

/** Devuelve true si el frame tiene algún píxel visible. */
export function frameHasContent(bitmap: ImageBitmap): boolean {
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return true;
    ctx.drawImage(bitmap, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) return true;
    }
    return false;
  } catch {
    // Ante la duda, no bloquear el frame.
    return true;
  }
}
