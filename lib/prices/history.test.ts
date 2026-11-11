import { describe, it, expect } from 'vitest';
import { parseCoingeckoCloses, parseEurostat, parseYahooCloses } from './history';

describe('parseYahooCloses', () => {
  it('fecha cada cierre y se salta los huecos', () => {
    const t = Date.UTC(2026, 0, 5, 8) / 1000;
    expect(parseYahooCloses({ chart: { result: [{ meta: { currency: 'EUR' }, timestamp: [t, t + 86400, t + 2 * 86400],
      indicators: { quote: [{ close: [10, null, 11] }] } }] } })).toEqual({ '2026-01-05': 10, '2026-01-07': 11 });
  });

  it('null si no es en euros', () => {
    expect(parseYahooCloses({ chart: { result: [{ meta: { currency: 'USD' }, timestamp: [1], indicators: { quote: [{ close: [1] }] } }] } })).toBeNull();
  });
});

describe('parseCoingeckoCloses', () => {
  it('un precio por día, el último', () => {
    const d = Date.UTC(2026, 0, 5);
    expect(parseCoingeckoCloses({ prices: [[d, 1], [d + 3600_000, 2], [d + 86400_000, 3]] })).toEqual({ '2026-01-05': 2, '2026-01-06': 3 });
    expect(parseCoingeckoCloses({})).toBeNull();
  });
});

describe('parseEurostat', () => {
  it('acepta 2025-01 y 2025M01', () => {
    expect(parseEurostat({ value: { 0: 100, 1: 101 }, dimension: { time: { category: { index: { '2025-01': 0, '2025M02': 1 } } } } }))
      .toEqual({ '2025-01': 100, '2025-02': 101 });
    expect(parseEurostat({})).toBeNull();
  });
});
