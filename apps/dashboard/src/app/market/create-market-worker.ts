/** Creates the single market Web Worker (Wasm producer lives inside). */
export function createMarketWorker(): Worker {
  return new Worker(new URL('./market.worker', import.meta.url));
}
