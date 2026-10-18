import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  template: `<p>Settings (stub)</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
