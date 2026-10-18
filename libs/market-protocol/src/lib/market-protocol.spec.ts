import {
  DEFAULT_PRODUCER_SETTINGS,
  type MarketSnapshot,
  type WorkerCommand,
  type WorkerMessage,
} from './market-protocol';

describe('market-protocol defaults', () => {
  it('matches planned settings defaults', () => {
    expect(DEFAULT_PRODUCER_SETTINGS).toEqual({
      instrumentCount: 5,
      batchSize: 100,
      intervalMs: 500,
    });
  });
});

describe('market-protocol shapes', () => {
  it('allows a typed apply command with runId', () => {
    const command: WorkerCommand = {
      type: 'apply',
      runId: 1,
      seed: 42,
      settings: { ...DEFAULT_PRODUCER_SETTINGS },
    };
    expect(command.runId).toBe(1);
  });

  it('allows a typed snapshot message with runId', () => {
    const snapshot: MarketSnapshot = {
      runId: 2,
      status: 'running',
      rows: [],
    };
    const message: WorkerMessage = { type: 'snapshot', snapshot };
    expect(message.snapshot.runId).toBe(2);
  });
});
