/** Symbols are derived in TS from instrument index (Wasm sends ids only). */
export function symbolForInstrument(instrumentId: number): string {
  return `INST${instrumentId}`;
}
