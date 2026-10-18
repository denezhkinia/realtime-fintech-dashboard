import { Pipe, PipeTransform } from '@angular/core';

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

/** Display: integer cents → USD; null/undefined → em dash. */
@Pipe({
  name: 'centsCurrency',
  standalone: true,
  pure: true,
})
export class CentsCurrencyPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) return '—';
    return currency.format(cents / 100);
  }
}
