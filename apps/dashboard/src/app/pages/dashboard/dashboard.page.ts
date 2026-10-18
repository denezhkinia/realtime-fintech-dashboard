import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { MarketSession } from '../../market/market-session.service';
import { formatCents } from './format-money';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
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
    if (status === 'idle') return 'Idle';
    if (status === 'running') return 'Running';
    if (status === 'paused') return 'Paused';
    return 'Error';
  });
  readonly isRunning = computed(() => this.snapshot().status === 'running');
  readonly formatCents = formatCents;

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
