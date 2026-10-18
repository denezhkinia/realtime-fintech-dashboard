const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

/** Display helper: cents → currency; null → em dash. */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return currency.format(cents / 100);
}
