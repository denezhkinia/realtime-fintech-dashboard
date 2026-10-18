import { TestBed } from '@angular/core/testing';
import type {
  MarketSnapshot,
  WorkerCommand,
  WorkerMessage,
} from '@realtime-fintech/market-protocol';
import { createMarketWorker } from './create-market-worker';
import { MarketSession } from './market-session.service';

jest.mock('./create-market-worker', () => ({
  createMarketWorker: jest.fn(),
}));

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly posts: WorkerCommand[] = [];
  terminate = jest.fn();

  postMessage(command: WorkerCommand): void {
    this.posts.push(command);
  }

  emit(message: WorkerMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerMessage>);
  }
}

describe('MarketSession', () => {
  let session: MarketSession;
  let worker: MockWorker;
  const createMarketWorkerMock = createMarketWorker as jest.MockedFunction<
    typeof createMarketWorker
  >;

  beforeEach(() => {
    worker = new MockWorker();
    createMarketWorkerMock.mockReset();
    createMarketWorkerMock.mockReturnValue(worker as unknown as Worker);

    TestBed.configureTestingModule({});
    session = TestBed.inject(MarketSession);
  });

  function lastPost(): WorkerCommand {
    expect(worker.posts.length).toBeGreaterThan(0);
    return worker.posts[worker.posts.length - 1];
  }

  it('uses a single worker across repeated injects (route-safe singleton)', () => {
    const again = TestBed.inject(MarketSession);
    again.ensureStarted();
    session.ensureStarted();
    expect(again).toBe(session);
    expect(createMarketWorkerMock).toHaveBeenCalledTimes(1);
  });

  it('Apply posts a new runId and clears prior snapshot rows when worker reports', () => {
    session.ensureStarted();
    const start = lastPost();
    expect(start.type).toBe('start');
    const startRunId = start.runId;

    worker.emit({
      type: 'snapshot',
      snapshot: {
        runId: startRunId,
        status: 'running',
        rows: [
          {
            instrumentId: 0,
            symbol: 'INST0',
            bidCents: 100,
            askCents: 110,
            lastCents: 110,
            volume: 5,
            vwapCents: 110,
          },
        ],
      },
    });
    expect(session.snapshot().rows[0]?.volume).toBe(5);

    session.apply({ instrumentCount: 3, batchSize: 50, intervalMs: 200 });
    const apply = lastPost();
    expect(apply.type).toBe('apply');
    expect(apply.runId).toBeGreaterThan(startRunId);

    worker.emit({
      type: 'snapshot',
      snapshot: {
        runId: apply.runId,
        status: 'running',
        rows: [
          {
            instrumentId: 0,
            symbol: 'INST0',
            bidCents: null,
            askCents: null,
            lastCents: null,
            volume: 0,
            vwapCents: null,
          },
        ],
      },
    });
    expect(session.snapshot().rows[0]?.volume).toBe(0);
    expect(session.snapshot().status).toBe('running');
  });

  it('pause keeps existing totals from the last snapshot', () => {
    session.ensureStarted();
    const startRunId = lastPost().runId;
    const populated: MarketSnapshot = {
      runId: startRunId,
      status: 'running',
      rows: [
        {
          instrumentId: 0,
          symbol: 'INST0',
          bidCents: 1000,
          askCents: 1010,
          lastCents: 1010,
          volume: 42,
          vwapCents: 1010,
        },
      ],
    };
    worker.emit({ type: 'snapshot', snapshot: populated });

    session.pause();
    expect(lastPost()).toEqual({ type: 'pause', runId: startRunId });

    worker.emit({
      type: 'snapshot',
      snapshot: { ...populated, status: 'paused' },
    });
    expect(session.snapshot().status).toBe('paused');
    expect(session.snapshot().rows[0]?.volume).toBe(42);
  });

  it('ignores stale runId snapshots', () => {
    session.ensureStarted();
    const liveRunId = lastPost().runId;

    worker.emit({
      type: 'snapshot',
      snapshot: {
        runId: liveRunId - 1,
        status: 'running',
        rows: [
          {
            instrumentId: 0,
            symbol: 'INST0',
            bidCents: 1,
            askCents: 2,
            lastCents: 2,
            volume: 999,
            vwapCents: 2,
          },
        ],
      },
    });
    expect(session.snapshot().rows).toEqual([]);

    worker.emit({
      type: 'snapshot',
      snapshot: {
        runId: liveRunId,
        status: 'running',
        rows: [
          {
            instrumentId: 0,
            symbol: 'INST0',
            bidCents: 1,
            askCents: 2,
            lastCents: 2,
            volume: 3,
            vwapCents: 2,
          },
        ],
      },
    });
    expect(session.snapshot().rows[0]?.volume).toBe(3);
  });

  it('terminates the worker on destroy', () => {
    session.ensureStarted();
    session.ngOnDestroy();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
