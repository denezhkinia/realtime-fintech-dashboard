import * as fs from 'fs';
import * as path from 'path';
import { instantiate } from '@assemblyscript/loader';
import {
  KIND_ASK,
  KIND_BID,
  KIND_TRADE,
  decodeBatch,
} from './batch-format';

type ProducerExports = {
  memory: WebAssembly.Memory;
  configure(instrumentCount: number, batchSize: number): void;
  reset(seed: number): void;
  nextBatch(): number;
  batchByteLength(): number;
};

const WASM_PATH = path.resolve(
  __dirname,
  '../../../../apps/dashboard/public/wasm/market-producer.wasm'
);

async function loadProducer(): Promise<ProducerExports> {
  const wasmBytes = fs.readFileSync(WASM_PATH);
  const { exports } = await instantiate(wasmBytes, {});
  return exports as unknown as ProducerExports;
}

function readBatch(exports: ProducerExports): Uint8Array {
  const ptr = exports.nextBatch();
  const len = exports.batchByteLength();
  return new Uint8Array(exports.memory.buffer, ptr, len).slice();
}

describe('market-producer wasm', () => {
  it('emits a batch with the configured size', async () => {
    const api = await loadProducer();
    api.configure(5, 37);
    api.reset(123);
    const updates = decodeBatch(readBatch(api));
    expect(updates).toHaveLength(37);
  });

  it('keeps bid < ask for each bid/ask pair sharing a mid tick', async () => {
    const api = await loadProducer();
    api.configure(3, 200);
    api.reset(7);

    const updates = decodeBatch(readBatch(api));
    for (let i = 0; i + 1 < updates.length; i++) {
      const a = updates[i];
      const b = updates[i + 1];
      if (
        a.kind === KIND_BID &&
        b.kind === KIND_ASK &&
        a.instrumentId === b.instrumentId
      ) {
        expect(a.priceCents).toBeLessThan(b.priceCents);
      }
    }
  });

  it('uses trade prices in {bid, ask} from the same tick', async () => {
    const api = await loadProducer();
    api.configure(4, 300);
    api.reset(99);

    const updates = decodeBatch(readBatch(api));
    for (let i = 0; i + 2 < updates.length; i++) {
      const bid = updates[i];
      const ask = updates[i + 1];
      const trade = updates[i + 2];
      if (
        bid.kind === KIND_BID &&
        ask.kind === KIND_ASK &&
        trade.kind === KIND_TRADE &&
        bid.instrumentId === ask.instrumentId &&
        ask.instrumentId === trade.instrumentId
      ) {
        expect(bid.priceCents).toBeLessThan(ask.priceCents);
        expect([bid.priceCents, ask.priceCents]).toContain(trade.priceCents);
      }
    }
  });

  it('is deterministic for the same seed and retains state across calls', async () => {
    const a = await loadProducer();
    a.configure(5, 20);
    a.reset(42);
    const first = Buffer.from(readBatch(a));
    const second = Buffer.from(readBatch(a));

    const b = await loadProducer();
    b.configure(5, 20);
    b.reset(42);
    const firstAgain = Buffer.from(readBatch(b));
    const secondAgain = Buffer.from(readBatch(b));

    expect(first.equals(firstAgain)).toBe(true);
    expect(second.equals(secondAgain)).toBe(true);
    expect(first.equals(second)).toBe(false);
  });
});
