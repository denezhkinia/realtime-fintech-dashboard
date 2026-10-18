/** Defaults from the take-home settings ranges. */
export const DEFAULT_PRODUCER_SETTINGS = {
  instrumentCount: 5,
  batchSize: 100,
  intervalMs: 500,
} as const;

export type ProducerSettings = {
  /** Instruments in the run; integer 1–50. */
  instrumentCount: number;
  /** Updates per Wasm batch; integer 1–1000. */
  batchSize: number;
  /** Generation interval in ms; integer 50–2000. */
  intervalMs: number;
};

/** Monotonic id for a generation run; stale worker messages are rejected. */
export type RunId = number;

export type SessionStatus = 'idle' | 'running' | 'paused' | 'error';

/** One instrument row in a UI snapshot (cents until display). */
export type InstrumentSnapshot = {
  instrumentId: number;
  symbol: string;
  bidCents: number | null;
  askCents: number | null;
  lastCents: number | null;
  /** Cumulative trade quantity since run start. */
  volume: number;
  /** Volume-weighted average price in cents; null when volume is 0. */
  vwapCents: number | null;
};

/** Object snapshot posted worker → UI (throttled ≤10 Hz). */
export type MarketSnapshot = {
  runId: RunId;
  status: SessionStatus;
  errorMessage?: string;
  rows: InstrumentSnapshot[];
};

/** Commands posted UI → worker. Every command carries `runId`. */
export type WorkerCommand =
  | {
      type: 'start';
      runId: RunId;
      settings: ProducerSettings;
      seed: number;
      wasmUrl: string;
    }
  | {
      type: 'apply';
      runId: RunId;
      settings: ProducerSettings;
      seed: number;
    }
  | { type: 'pause'; runId: RunId }
  | { type: 'resume'; runId: RunId };

/** Messages posted worker → UI. */
export type WorkerMessage =
  | { type: 'snapshot'; snapshot: MarketSnapshot }
  | { type: 'init-error'; runId: RunId; message: string };
