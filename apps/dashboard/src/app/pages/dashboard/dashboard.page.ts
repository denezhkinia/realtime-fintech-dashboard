import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  template: `<p>Dashboard (stub)</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
