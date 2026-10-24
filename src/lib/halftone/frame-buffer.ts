/* ------------------------------------------------------------------ */
/* Buffer de frames del preview.                                       */
/*                                                                     */
/* Resuelve dos problemas de ciclo de vida del canvas:                 */
/*  - Un frame puede llegar antes de que el <canvas> esté montado      */
/*    (p. ej. el worker termina mientras React aún no ha hecho commit).*/
/*    En ese caso se conserva como "pendiente" en lugar de cerrarlo.   */
/*  - Al reemplazar un frame hay que cerrar el ImageBitmap anterior    */
/*    exactamente una vez para liberar memoria y recursos GPU.         */
/*                                                                     */
/* Sin dependencias de DOM/GPU: testeable en Node.                     */
/* ------------------------------------------------------------------ */

export type CloseableBitmap = Pick<ImageBitmap, "close">;

export class PreviewFrameBuffer {
  private pending: ImageBitmap | null = null;
  private current: ImageBitmap | null = null;
  private disposed = false;

  /** Encola el frame más reciente; cierra el pendiente anterior. */
  enqueue(bitmap: ImageBitmap): void {
    if (this.disposed) {
      bitmap.close();
      return;
    }
    this.pending?.close();
    this.pending = bitmap;
  }

  /** Devuelve el frame pendiente sin cerrarlo (o null). */
  takePending(): ImageBitmap | null {
    const bitmap = this.pending;
    this.pending = null;
    return bitmap;
  }

  /** Registra el frame dibujado; cierra el anterior exactamente una vez. */
  commit(bitmap: ImageBitmap): void {
    if (this.current && this.current !== bitmap) {
      this.current.close();
    }
    this.current = bitmap;
  }

  /** Bitmap actualmente en pantalla (para diagnóstico/tests). */
  get currentBitmap(): ImageBitmap | null {
    return this.current;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Libera pendiente y actual; los frames posteriores se cierran solos. */
  dispose(): void {
    this.disposed = true;
    this.pending?.close();
    this.pending = null;
    this.current?.close();
    this.current = null;
  }
}
