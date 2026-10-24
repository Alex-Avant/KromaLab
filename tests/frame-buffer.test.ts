import assert from "node:assert/strict";
import test from "node:test";

import { PreviewFrameBuffer } from "@/lib/halftone/frame-buffer";

type FakeBitmap = ImageBitmap & { label: string; closedCount: number };

function fakeBitmap(label: string): FakeBitmap {
  const bitmap = {
    label,
    closedCount: 0,
    close() {
      bitmap.closedCount += 1;
    },
  };
  return bitmap as unknown as FakeBitmap;
}

test("conserva el frame pendiente cuando el canvas aún no está montado", () => {
  const buffer = new PreviewFrameBuffer();
  const frame = fakeBitmap("frame-1");

  buffer.enqueue(frame);

  assert.equal(buffer.currentBitmap, null);
  assert.equal(frame.closedCount, 0);
  assert.equal(buffer.takePending(), frame);
  assert.equal(frame.closedCount, 0);
  assert.equal(buffer.takePending(), null);
});

test("el frame pendiente más reciente cierra al anterior exactamente una vez", () => {
  const buffer = new PreviewFrameBuffer();
  const older = fakeBitmap("older");
  const newer = fakeBitmap("newer");

  buffer.enqueue(older);
  buffer.enqueue(newer);

  assert.equal(older.closedCount, 1, "el pendiente obsoleto se libera");
  assert.equal(newer.closedCount, 0, "el vigente no se libera");
  assert.equal(buffer.takePending(), newer);
});

test("commit cierra el frame anterior y no duplica cierres", () => {
  const buffer = new PreviewFrameBuffer();
  const first = fakeBitmap("first");
  const second = fakeBitmap("second");

  buffer.commit(first);
  assert.equal(first.closedCount, 0);

  buffer.commit(second);
  assert.equal(first.closedCount, 1, "el frame sustituido se libera");
  assert.equal(second.closedCount, 0);

  buffer.commit(second);
  assert.equal(second.closedCount, 0, "commit del mismo frame no lo cierra");
  assert.equal(buffer.currentBitmap, second);
});

test("dispose libera pendiente y actual una sola vez y rechaza frames nuevos", () => {
  const buffer = new PreviewFrameBuffer();
  const pending = fakeBitmap("pending");
  const current = fakeBitmap("current");

  buffer.enqueue(pending);
  buffer.commit(current);
  buffer.dispose();

  assert.equal(pending.closedCount, 1);
  assert.equal(current.closedCount, 1);
  assert.equal(buffer.isDisposed, true);
  assert.equal(buffer.takePending(), null);

  const late = fakeBitmap("late");
  buffer.enqueue(late);
  assert.equal(late.closedCount, 1, "un frame tardío se cierra al instante");
});
