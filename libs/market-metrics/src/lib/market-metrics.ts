export type UpdateKind = 'bid' | 'ask' | 'trade';

export type MarketUpdate = {
  instrumentId: number;
  kind: UpdateKind;
  priceCents: number;
  qty: number;
};

type InstrumentAccum = {
  bidCents: number | null;
  askCents: number | null;
  lastCents: number | null;
  /** Cumulative traded shares since run start. */
  volume: bigint;
  /** Sum of priceCents * qty for trades. */
  notionalCentsShares: bigint;
};

export type MetricsState = {
  instruments: Map<number, InstrumentAccum>;
};

export type MetricsRow = {
  instrumentId: number;
  symbol: string;
  bidCents: number | null;
  askCents: number | null;
  lastCents: number | null;
  volume: number;
  vwapCents: number | null;
};

function emptyAccum(): InstrumentAccum {
  return {
    bidCents: null,
    askCents: null,
    lastCents: null,
    volume: BigInt(0),
    notionalCentsShares: BigInt(0),
  };
}

function getOrCreate(
  state: MetricsState,
  instrumentId: number
): InstrumentAccum {
  let accum = state.instruments.get(instrumentId);
  if (!accum) {
    accum = emptyAccum();
    state.instruments.set(instrumentId, accum);
  }
  return accum;
}

export function createMetricsState(): MetricsState {
  return { instruments: new Map() };
}

export function applyUpdate(state: MetricsState, update: MarketUpdate): void {
  const accum = getOrCreate(state, update.instrumentId);

  switch (update.kind) {
    case 'bid':
      accum.bidCents = update.priceCents;
      break;
    case 'ask':
      accum.askCents = update.priceCents;
      break;
    case 'trade': {
      const qty = BigInt(update.qty);
      accum.volume += qty;
      accum.notionalCentsShares += BigInt(update.priceCents) * qty;
      accum.lastCents = update.priceCents;
      break;
    }
  }
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
