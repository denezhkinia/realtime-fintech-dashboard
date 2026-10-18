/** Matches assembly/index.ts binary layout. */
export const KIND_BID = 0;
export const KIND_ASK = 1;
export const KIND_TRADE = 2;
export const RECORD_SIZE = 13;
export const HEADER_SIZE = 4;

export type BatchUpdate = {
  instrumentId: number;
  kind: number;
  priceCents: number;
  qty: number;
};

export function decodeBatch(bytes: Uint8Array): BatchUpdate[] {
  if (bytes.byteLength < HEADER_SIZE) {
    throw new Error('batch too short for header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(0, true);
  const expected = HEADER_SIZE + count * RECORD_SIZE;
  if (bytes.byteLength < expected) {
    throw new Error(
      `batch length ${bytes.byteLength} < expected ${expected} for count ${count}`
    );
  }

  const updates: BatchUpdate[] = [];
  let offset = HEADER_SIZE;
  for (let i = 0; i < count; i++) {
    const instrumentId = view.getUint32(offset, true);
    const kind = view.getUint8(offset + 4);
    const priceCents = view.getInt32(offset + 5, true);
    const qty = view.getUint32(offset + 9, true);
    updates.push({ instrumentId, kind, priceCents, qty });
    offset += RECORD_SIZE;
  }
  return updates;
}
