import { CentsCurrencyPipe } from './cents-currency.pipe';

describe('CentsCurrencyPipe', () => {
  const pipe = new CentsCurrencyPipe();

  it('formats cents as USD', () => {
    expect(pipe.transform(10_150)).toBe(
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
      }).format(101.5)
    );
  });

  it('shows an em dash for null and undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('formats zero cents as USD zero', () => {
    expect(pipe.transform(0)).toBe(
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
      }).format(0)
    );
  });
});
