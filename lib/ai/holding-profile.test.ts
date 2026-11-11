import { describe, it, expect } from 'vitest';
import { genericProfile, parseProfile, profilePrompt } from './holding-profile';

describe('parseProfile', () => {
  it('lee el JSON aunque venga entre ```', () => {
    expect(parseProfile('```json\n{"summary":"Copia el MSCI World.","invests_in":"Empresas grandes","risk":4,"ter":0.0012,"indexed":true}\n```'))
      .toEqual({ summary: 'Copia el MSCI World.', investsIn: 'Empresas grandes', risk: 4, ter: 0.0012, indexed: true });
  });

  it('descarta riesgo fuera de rango, comisión rara o texto sin JSON', () => {
    expect(parseProfile('{"summary":"a","invests_in":"b","risk":9}')).toBeNull();
    expect(parseProfile('no sé')).toBeNull();
    expect(parseProfile('{"summary":"a","invests_in":"b","risk":3,"ter":5}')?.ter).toBeNull();
  });
});

describe('genericProfile y profilePrompt', () => {
  it('hay ficha general para fondos, acciones y cripto', () => {
    expect(genericProfile('crypto')?.risk).toBe(7);
    expect(genericProfile('cash')).toBeNull();
  });

  it('el prompt solo lleva los datos que hay', () => {
    expect(profilePrompt({ name: 'Bitcoin', kind: 'crypto', isin: null, priceSymbol: null, coingeckoId: 'bitcoin' }))
      .toBe('Nombre: Bitcoin\nTipo: criptomoneda\nId CoinGecko: bitcoin');
  });
});
