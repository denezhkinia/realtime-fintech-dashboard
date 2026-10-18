import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketSession } from '../../market/market-session.service';
import { createMarketWorker } from '../../market/create-market-worker';
import { SettingsPage } from './settings.page';

jest.mock('../../market/create-market-worker', () => ({
  createMarketWorker: jest.fn(),
}));

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();
}

describe('SettingsPage aria-invalid from form state', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let page: SettingsPage;

  beforeEach(() => {
    const createMarketWorkerMock = createMarketWorker as jest.MockedFunction<
      typeof createMarketWorker
    >;
    createMarketWorkerMock.mockReset();
    createMarketWorkerMock.mockReturnValue(new MockWorker() as unknown as Worker);

    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [MarketSession],
    });
    fixture = TestBed.createComponent(SettingsPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  function input(id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`#${id}`);
  }

  it('does not set aria-invalid before touch or submit', () => {
    page.form.controls.instrumentCount.setValue(0);
    fixture.detectChanges();
    expect(input('instrumentCount').getAttribute('aria-invalid')).toBeNull();
    expect(page.showInvalid('instrumentCount')).toBe(false);
  });

  it('sets aria-invalid when invalid and touched', () => {
    page.form.controls.instrumentCount.setValue(0);
    page.form.controls.instrumentCount.markAsTouched();
    fixture.detectChanges();
    expect(page.showInvalid('instrumentCount')).toBe(true);
    expect(input('instrumentCount').getAttribute('aria-invalid')).toBe('true');
    expect(input('instrumentCount').classList.contains('is-invalid')).toBe(true);
  });

  it('sets aria-invalid for invalid controls after submit', () => {
    page.form.controls.batchSize.setValue(0);
    const formEl = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(page.submitted()).toBe(true);
    expect(page.showInvalid('batchSize')).toBe(true);
    expect(input('batchSize').getAttribute('aria-invalid')).toBe('true');
    expect(input('batchSize-error').hidden).toBe(false);
  });

  it('keeps Apply enabled', () => {
    const apply = fixture.nativeElement.querySelector(
      'button.apply'
    ) as HTMLButtonElement;
    expect(apply.disabled).toBe(false);
  });
});
