import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MarketSession } from '../../market/market-session.service';

type SettingsControlName = 'instrumentCount' | 'batchSize' | 'intervalMs';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(MarketSession);

  /** True after the user attempts Apply; drives aria-invalid with touched. */
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    instrumentCount: [
      this.session.settings().instrumentCount,
      [Validators.required, Validators.min(1), Validators.max(50)],
    ],
    batchSize: [
      this.session.settings().batchSize,
      [Validators.required, Validators.min(1), Validators.max(1000)],
    ],
    intervalMs: [
      this.session.settings().intervalMs,
      [Validators.required, Validators.min(50), Validators.max(2000)],
    ],
  });

  /** Invalid after blur or after a submit attempt — keeps AT and visuals aligned. */
  showInvalid(name: SettingsControlName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  onSubmit(event: Event): void {
    this.submitted.set(true);
    const formEl = event.target as HTMLFormElement;
    if (!formEl.checkValidity() || this.form.invalid) {
      // Keep Apply enabled; native constraints can still focus the first bad field.
      return;
    }
    const value = this.form.getRawValue();
    this.session.apply({
      instrumentCount: Number(value.instrumentCount),
      batchSize: Number(value.batchSize),
      intervalMs: Number(value.intervalMs),
    });
  }
}
