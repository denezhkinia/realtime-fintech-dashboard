import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { SessionStatus } from '@realtime-fintech/market-protocol';
import { MarketSession } from '../../market/market-session.service';
import { CentsCurrencyPipe } from './cents-currency.pipe';
import { MarketVolumePipe } from './market-volume.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CentsCurrencyPipe, MarketVolumePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly session = inject(MarketSession);

  readonly snapshot = this.session.snapshot;
  readonly initError = this.session.initError;
  readonly statusLabel = computed(() => {
    const status = this.snapshot().status;
    if (status === SessionStatus.Idle) return 'Idle';
    if (status === SessionStatus.Running) return 'Running';
    if (status === SessionStatus.Paused) return 'Paused';
    return 'Error';
  });
  readonly isRunning = computed(
    () => this.snapshot().status === SessionStatus.Running
  );

  constructor() {
    this.session.ensureStarted();
  }

  pause(): void {
    this.session.pause();
  }

  resume(): void {
    this.session.resume();
  }
}
