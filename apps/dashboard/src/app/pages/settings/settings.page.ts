import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MarketSession } from '../../market/market-session.service';
import { bindUserInvalidSync } from './sync-user-invalid';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(MarketSession);
  private readonly formRef = viewChild<ElementRef<HTMLFormElement>>('settingsForm');
  private unbind: (() => void) | null = null;

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

  ngAfterViewInit(): void {
    const el = this.formRef()?.nativeElement;
    if (el) {
      this.unbind = bindUserInvalidSync(el);
    }
  }

  ngOnDestroy(): void {
    this.unbind?.();
  }

  onSubmit(event: Event): void {
    const formEl = event.target as HTMLFormElement;
    if (!formEl.checkValidity()) {
      // Keep Apply enabled; native focus moves to the first invalid field.
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
