import { Injectable, OnDestroy, signal } from '@angular/core';
import {
  DEFAULT_PRODUCER_SETTINGS,
  SessionStatus,
  WorkerCommandType,
  WorkerMessageType,
  type MarketSnapshot,
  type ProducerSettings,
  type WorkerCommand,
  type WorkerMessage,
} from '@realtime-fintech/market-protocol';
import { createMarketWorker } from './create-market-worker';

@Injectable({ providedIn: 'root' })
export class MarketSession implements OnDestroy {
  private worker: Worker | null = null;
  private runId = 0;
  private started = false;

  readonly snapshot = signal<MarketSnapshot>({
    runId: 0,
    status: SessionStatus.Idle,
    rows: [],
  });
  readonly settings = signal<ProducerSettings>({ ...DEFAULT_PRODUCER_SETTINGS });
  readonly initError = signal<string | null>(null);

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = createMarketWorker();
      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.onWorkerMessage(event.data);
      };
      this.worker.onerror = (event) => {
        this.initError.set(event.message || 'Market worker error');
      };
    }
    return this.worker;
  }

  private onWorkerMessage(message: WorkerMessage): void {
    if (message.type === WorkerMessageType.InitError) {
      if (message.runId !== this.runId) return;
      this.initError.set(message.message);
      return;
    }

    if (message.snapshot.runId !== this.runId) {
      // Reject stale run results.
      return;
    }
    this.initError.set(null);
    this.snapshot.set(copySnapshot(message.snapshot));
  }

  private post(command: WorkerCommand): void {
    this.ensureWorker().postMessage(command);
  }

  private wasmUrl(): string {
    const baseHref =
      document.querySelector('base')?.getAttribute('href') || '/';
    const origin =
      typeof location !== 'undefined' && location.origin
        ? location.origin
        : 'http://localhost';
    return new URL(
      'wasm/market-producer.wasm',
      new URL(baseHref, origin)
    ).toString();
  }

  private nextSeed(): number {
    return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 || 1;
  }

  /** Start generation once; later Apply resets the same worker. */
  ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    this.runId += 1;
    this.post({
      type: WorkerCommandType.Start,
      runId: this.runId,
      settings: { ...this.settings() },
      seed: this.nextSeed(),
      wasmUrl: this.wasmUrl(),
    });
  }

  apply(settings: ProducerSettings): void {
    const next = { ...settings };
    this.settings.set(next);
    this.ensureWorker();
    this.runId += 1;
    this.started = true;
    this.post({
      type: WorkerCommandType.Apply,
      runId: this.runId,
      settings: { ...next },
      seed: this.nextSeed(),
    });
  }

  pause(): void {
    if (!this.started) return;
    this.post({ type: WorkerCommandType.Pause, runId: this.runId });
  }

  resume(): void {
    if (!this.started) {
      this.ensureStarted();
      return;
    }
    this.post({ type: WorkerCommandType.Resume, runId: this.runId });
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

function copySnapshot(snapshot: MarketSnapshot): MarketSnapshot {
  return {
    ...snapshot,
    rows: snapshot.rows.map((row) => ({ ...row })),
  };
}
