/// <reference lib="webworker" />
/**
 * Whole Wasm + aggregation run in this Worker. UI receives object snapshots
 * at ≤10 Hz (plus immediate publish on pause/apply). No SharedArrayBuffer.
 */
import { instantiate } from '@assemblyscript/loader';
import {
  applyUpdate,
  createMetricsState,
  toRow,
  type MetricsState,
} from '@realtime-fintech/market-metrics';
import {
  decodeBatch,
  updateKindFromWasm,
} from '@realtime-fintech/market-producer';
import {
  SessionStatus,
  WorkerCommandType,
  WorkerMessageType,
  type InstrumentSnapshot,
  type ProducerSettings,
  type RunId,
  type WorkerCommand,
  type WorkerMessage,
} from '@realtime-fintech/market-protocol';
import { symbolForInstrument } from './instrument-symbols';

type ProducerApi = {
  memory: WebAssembly.Memory;
  configure(instrumentCount: number, batchSize: number): void;
  reset(seed: number): void;
  nextBatch(): number;
  batchByteLength(): number;
};

const SNAPSHOT_MIN_INTERVAL_MS = 100; // ≤10 Hz to the UI

let api: ProducerApi | null = null;
let timerId: ReturnType<typeof setInterval> | null = null;
let runId: RunId = 0;
let intervalMs = 500;
let settings: ProducerSettings | null = null;
let metrics: MetricsState = createMetricsState();
let lastSnapshotAt = 0;
let snapshotTimerId: ReturnType<typeof setTimeout> | null = null;

function post(message: WorkerMessage): void {
  (self as DedicatedWorkerGlobalScope).postMessage(message);
}

function clearGenerationTimer(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function clearSnapshotTimer(): void {
  if (snapshotTimerId !== null) {
    clearTimeout(snapshotTimerId);
    snapshotTimerId = null;
  }
}

function buildRows(): InstrumentSnapshot[] {
  if (!settings) return [];
  const rows: InstrumentSnapshot[] = [];
  for (let id = 0; id < settings.instrumentCount; id++) {
    const row = toRow(metrics, id, symbolForInstrument(id));
    rows.push({
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      bidCents: row.bidCents,
      askCents: row.askCents,
      lastCents: row.lastCents,
      volume: row.volume,
      vwapCents: row.vwapCents,
    });
  }
  return rows;
}

type PublishableStatus =
  | SessionStatus.Running
  | SessionStatus.Paused
  | SessionStatus.Error;

function publishSnapshot(
  status: PublishableStatus,
  errorMessage?: string
): void {
  lastSnapshotAt = Date.now();
  clearSnapshotTimer();
  post({
    type: WorkerMessageType.Snapshot,
    snapshot: {
      runId,
      status,
      errorMessage,
      rows: buildRows(),
    },
  });
}

/** Throttle UI snapshots to ≤10 Hz while aggregating every batch. */
function scheduleSnapshot(status: PublishableStatus): void {
  const elapsed = Date.now() - lastSnapshotAt;
  if (elapsed >= SNAPSHOT_MIN_INTERVAL_MS) {
    publishSnapshot(status);
    return;
  }
  if (snapshotTimerId !== null) return;
  snapshotTimerId = setTimeout(() => {
    snapshotTimerId = null;
    publishSnapshot(status);
  }, SNAPSHOT_MIN_INTERVAL_MS - elapsed);
}

function ingestBatch(): void {
  if (!api) return;
  const ptr = api.nextBatch();
  const len = api.batchByteLength();
  const bytes = new Uint8Array(api.memory.buffer, ptr, len).slice();
  const updates = decodeBatch(bytes);
  for (const update of updates) {
    const kind = updateKindFromWasm(update.kind);
    if (!kind) continue;
    applyUpdate(metrics, {
      instrumentId: update.instrumentId,
      kind,
      priceCents: update.priceCents,
      qty: update.qty,
    });
  }
}

function tick(): void {
  ingestBatch();
  scheduleSnapshot(SessionStatus.Running);
}

function startGenerationTimer(): void {
  clearGenerationTimer();
  timerId = setInterval(tick, intervalMs);
}

async function loadWasm(wasmUrl: string): Promise<ProducerApi> {
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Wasm fetch failed (${response.status}) for ${wasmUrl}`);
  }
  const bytes = await response.arrayBuffer();
  const result = await instantiate(bytes, {});
  return result.exports as unknown as ProducerApi;
}

function resetAndRun(
  next: ProducerSettings,
  seed: number,
  nextRunId: RunId
): void {
  if (!api) {
    throw new Error('Producer Wasm is not initialized');
  }
  runId = nextRunId;
  settings = next;
  intervalMs = next.intervalMs;
  metrics = createMetricsState();
  api.configure(next.instrumentCount, next.batchSize);
  api.reset(seed >>> 0);
  clearGenerationTimer();
  startGenerationTimer();
  // Immediate publish on apply/start.
  publishSnapshot(SessionStatus.Running);
}

self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  try {
    switch (command.type) {
      case WorkerCommandType.Start: {
        clearGenerationTimer();
        clearSnapshotTimer();
        runId = command.runId;
        settings = command.settings;
        intervalMs = command.settings.intervalMs;
        api = await loadWasm(command.wasmUrl);
        resetAndRun(command.settings, command.seed, command.runId);
        break;
      }
      case WorkerCommandType.Apply: {
        if (!api) {
          throw new Error('Apply received before Wasm init');
        }
        resetAndRun(command.settings, command.seed, command.runId);
        break;
      }
      case WorkerCommandType.Pause: {
        if (command.runId !== runId) return;
        // Pause stops generation with no catch-up batches.
        clearGenerationTimer();
        publishSnapshot(SessionStatus.Paused);
        break;
      }
      case WorkerCommandType.Resume: {
        if (command.runId !== runId) return;
        if (!api || !settings) {
          throw new Error('Resume received before producer was configured');
        }
        intervalMs = settings.intervalMs;
        startGenerationTimer();
        publishSnapshot(SessionStatus.Running);
        break;
      }
    }
  } catch (error) {
    clearGenerationTimer();
    clearSnapshotTimer();
    const message = error instanceof Error ? error.message : String(error);
    post({ type: WorkerMessageType.InitError, runId, message });
    publishSnapshot(SessionStatus.Error, message);
  }
};

export {};
