import { MarketVolumePipe } from './market-volume.pipe';

describe('MarketVolumePipe', () => {
  const pipe = new MarketVolumePipe();

  it('shows 0 for zero volume', () => {
    expect(pipe.transform(0)).toBe('0');
  });

  it('formats positive volume', () => {
    expect(pipe.transform(42)).toBe('42');
  });

  it('treats null and undefined as 0', () => {
    expect(pipe.transform(null)).toBe('0');
    expect(pipe.transform(undefined)).toBe('0');
  });
});
