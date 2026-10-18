import { UpdateKind } from '@realtime-fintech/market-protocol';
import {
  applyUpdate,
  createMetricsState,
  toRow,
  type MarketUpdate,
} from './market-metrics';

function applyAll(
  updates: readonly MarketUpdate[]
) {
  return updates.reduce(applyUpdate, createMetricsState());
}

describe('market-metrics', () => {
  it('computes VWAP for the worked example ($100×10 + $102×30 → $101.50)', () => {
    const state = applyAll([
      {
        instrumentId: 0,
        kind: UpdateKind.Trade,
        priceCents: 10_000,
        qty: 10,
      },
      {
        instrumentId: 0,
        kind: UpdateKind.Trade,
        priceCents: 10_200,
        qty: 30,
      },
    ]);

    const row = toRow(state, 0, 'INST0');
    expect(row.volume).toBe(40);
    expect(row.vwapCents).toBe(10_150);
  });

  it('marks VWAP unavailable when volume is zero', () => {
    const state = applyAll([
      {
        instrumentId: 0,
        kind: UpdateKind.Bid,
        priceCents: 10_000,
        qty: 5,
      },
      {
        instrumentId: 0,
        kind: UpdateKind.Ask,
        priceCents: 10_100,
        qty: 5,
      },
    ]);

    const row = toRow(state, 0, 'INST0');
    expect(row.volume).toBe(0);
    expect(row.vwapCents).toBeNull();
    expect(row.bidCents).toBe(10_000);
    expect(row.askCents).toBe(10_100);
  });

  it('keeps instruments isolated', () => {
    const state = applyAll([
      {
        instrumentId: 0,
        kind: UpdateKind.Trade,
        priceCents: 10_000,
        qty: 10,
      },
      {
        instrumentId: 1,
        kind: UpdateKind.Trade,
        priceCents: 20_000,
        qty: 2,
      },
    ]);

    const a = toRow(state, 0, 'INST0');
    const b = toRow(state, 1, 'INST1');
    expect(a.volume).toBe(10);
    expect(a.vwapCents).toBe(10_000);
    expect(b.volume).toBe(2);
    expect(b.vwapCents).toBe(20_000);
  });

  it('does not count bid/ask quantity toward cumulative volume', () => {
    const state = applyAll([
      {
        instrumentId: 0,
        kind: UpdateKind.Bid,
        priceCents: 9_900,
        qty: 100,
      },
      {
        instrumentId: 0,
        kind: UpdateKind.Ask,
        priceCents: 10_100,
        qty: 100,
      },
      {
        instrumentId: 0,
        kind: UpdateKind.Trade,
        priceCents: 10_100,
        qty: 7,
      },
    ]);

    const row = toRow(state, 0, 'INST0');
    expect(row.volume).toBe(7);
    expect(row.vwapCents).toBe(10_100);
    expect(row.lastCents).toBe(10_100);
  });

  it('returns a new state and leaves the previous one unchanged', () => {
    const before = createMetricsState();
    const after = applyUpdate(before, {
      instrumentId: 0,
      kind: UpdateKind.Trade,
      priceCents: 10_000,
      qty: 10,
    });

    expect(after).not.toBe(before);
    expect(toRow(before, 0, 'INST0').volume).toBe(0);
    expect(toRow(after, 0, 'INST0').volume).toBe(10);
  });
});
