import { UpdateKind } from '@realtime-fintech/market-protocol';

/** Matches assembly/index.ts binary layout (numeric kinds stay in Wasm). */
export enum WasmUpdateKind {
  Bid = 0,
  Ask = 1,
  Trade = 2,
}

export const RECORD_SIZE = 13;
export const HEADER_SIZE = 4;

export type BatchUpdate = {
  instrumentId: number;
  kind: number;
  priceCents: number;
  qty: number;
};

/** Map a Wasm kind code to the shared UpdateKind once at the TS boundary. */
export function updateKindFromWasm(code: number): UpdateKind | null {
  switch (code) {
    case WasmUpdateKind.Bid:
      return UpdateKind.Bid;
    case WasmUpdateKind.Ask:
      return UpdateKind.Ask;
    case WasmUpdateKind.Trade:
      return UpdateKind.Trade;
    default:
      return null;
  }
}

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
