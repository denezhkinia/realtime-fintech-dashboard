import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { createMarketWorker } from './create-market-worker';
import { MarketSession } from './market-session.service';

jest.mock('./create-market-worker', () => ({
  createMarketWorker: jest.fn(),
}));

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();
}

@Component({
  standalone: true,
  template: `<p>dash</p>`,
})
class DashStub {
  constructor(session: MarketSession) {
    session.ensureStarted();
  }
}

@Component({
  standalone: true,
  template: `<p>settings</p>`,
})
class SettingsStub {
  constructor(session: MarketSession) {
    void session.settings();
  }
}

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
class HostComponent {}

describe('MarketSession navigation glue', () => {
  const createMarketWorkerMock = createMarketWorker as jest.MockedFunction<
    typeof createMarketWorker
  >;

  beforeEach(() => {
    createMarketWorkerMock.mockReset();
    createMarketWorkerMock.mockReturnValue(new MockWorker() as unknown as Worker);

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          { path: '', component: DashStub },
          { path: 'settings', component: SettingsStub },
        ]),
      ],
    });
  });

  it('keeps one worker when navigating between dashboard and settings', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const session = TestBed.inject(MarketSession);

    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(createMarketWorkerMock).toHaveBeenCalledTimes(1);
    const runAfterDash = session['runId'];

    await router.navigateByUrl('/settings');
    fixture.detectChanges();
    await fixture.whenStable();

    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(createMarketWorkerMock).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(MarketSession)).toBe(session);
    expect(session['runId']).toBe(runAfterDash);
  });
});
