import { UpdateKind } from '@realtime-fintech/market-protocol';

export { UpdateKind };

export type MarketUpdate = Readonly<{
  instrumentId: number;
  kind: UpdateKind;
  priceCents: number;
  qty: number;
}>;

type InstrumentAccum = Readonly<{
  bidCents: number | null;
  askCents: number | null;
  lastCents: number | null;
  /** Cumulative traded shares since run start. */
  volume: bigint;
  /** Sum of priceCents * qty for trades. */
  notionalCentsShares: bigint;
}>;

export type MetricsState = Readonly<{
  instruments: ReadonlyMap<number, InstrumentAccum>;
}>;

export type MetricsRow = Readonly<{
  instrumentId: number;
  symbol: string;
  bidCents: number | null;
  askCents: number | null;
  lastCents: number | null;
  volume: number;
  vwapCents: number | null;
}>;

function emptyAccum(): InstrumentAccum {
  return {
    bidCents: null,
    askCents: null,
    lastCents: null,
    volume: BigInt(0),
    notionalCentsShares: BigInt(0),
  };
}

function withInstrument(
  state: MetricsState,
  instrumentId: number,
  accum: InstrumentAccum
): MetricsState {
  return {
    instruments: new Map([...state.instruments, [instrumentId, accum]]),
  };
}

function nextAccum(prev: InstrumentAccum, update: MarketUpdate): InstrumentAccum {
  switch (update.kind) {
    case UpdateKind.Bid:
      return { ...prev, bidCents: update.priceCents };
    case UpdateKind.Ask:
      return { ...prev, askCents: update.priceCents };
    case UpdateKind.Trade: {
      const qty = BigInt(update.qty);
      return {
        ...prev,
        volume: prev.volume + qty,
        notionalCentsShares:
          prev.notionalCentsShares + BigInt(update.priceCents) * qty,
        lastCents: update.priceCents,
      };
    }
  }
}

export function createMetricsState(): MetricsState {
  return { instruments: new Map() };
}

/** Returns the next state. The previous state is left unchanged. */
export function applyUpdate(
  state: MetricsState,
  update: MarketUpdate
): MetricsState {
  const prev = state.instruments.get(update.instrumentId) ?? emptyAccum();
  return withInstrument(state, update.instrumentId, nextAccum(prev, update));
}

export function toRow(
  state: MetricsState,
  instrumentId: number,
  symbol: string
): MetricsRow {
  const accum = state.instruments.get(instrumentId) ?? emptyAccum();
  const volume = Number(accum.volume);
  const vwapCents =
    accum.volume === BigInt(0)
      ? null
      : Number(accum.notionalCentsShares / accum.volume);

  return {
    instrumentId,
    symbol,
    bidCents: accum.bidCents,
    askCents: accum.askCents,
    lastCents: accum.lastCents,
    volume,
    vwapCents,
  };
}
