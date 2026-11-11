import { describe, it, expect } from 'vitest';
import { activePriceKeys, isYahooKey, priceKey, yahooSymbol } from './keys';

describe('priceKey', () => {
  it('cripto usa el id de CoinGecko', () => {
    expect(priceKey({ kind: 'crypto', coingeckoId: 'bitcoin', priceSymbol: null })).toBe('bitcoin');
  });
  it('fondo y acción con símbolo usan Yahoo', () => {
    expect(priceKey({ kind: 'fund', coingeckoId: null, priceSymbol: '0P0001CLDK.F' })).toBe('yf:0P0001CLDK.F');
    expect(priceKey({ kind: 'stock', coingeckoId: null, priceSymbol: 'ABEA.DE' })).toBe('yf:ABEA.DE');
  });
  it('sin símbolo o en efectivo no hay precio', () => {
    expect(priceKey({ kind: 'fund', coingeckoId: null, priceSymbol: null })).toBeNull();
    expect(priceKey({ kind: 'cash', coingeckoId: null, priceSymbol: 'X' })).toBeNull();
  });
});

describe('activePriceKeys', () => {
  it('deduplica e ignora las archivadas', () => {
    expect(activePriceKeys([
      { kind: 'crypto', coingeckoId: 'bitcoin', priceSymbol: null, archived: false },
      { kind: 'crypto', coingeckoId: 'bitcoin', priceSymbol: null, archived: false },
      { kind: 'stock', coingeckoId: null, priceSymbol: 'ABEA.DE', archived: true },
      { kind: 'stock', coingeckoId: null, priceSymbol: 'SAP.DE', archived: false },
    ])).toEqual(['bitcoin', 'yf:SAP.DE']);
  });
  it('reconoce y desarma las claves de Yahoo', () => {
    expect(isYahooKey('yf:ABEA.DE')).toBe(true);
    expect(isYahooKey('bitcoin')).toBe(false);
    expect(yahooSymbol('yf:ABEA.DE')).toBe('ABEA.DE');
  });
});
