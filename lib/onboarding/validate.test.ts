import { describe, it, expect } from 'vitest';
import { openingDate, validateOnboarding, type OnboardingInput } from './validate';

const base = (): OnboardingInput => ({
  banks: [{ name: 'BBVA', color: '#1464a5', cash: 1200 }, { name: 'Trade Republic', color: '#a1a1aa', cash: null }],
  assets: [
    { name: 'Bitcoin', kind: 'crypto', coingeckoId: 'bitcoin', priceSymbol: null, bank: 'Trade Republic', valueEur: 500, investedEur: 400 },
    { name: 'MSCI World', kind: 'fund', coingeckoId: null, priceSymbol: 'EUNL.DE', bank: 'bbva', valueEur: 1000, investedEur: null },
  ],
  salary: { amount: 1500, day: 28, bank: 'BBVA' },
  subscriptions: [{ name: 'Netflix', amount: 13.99, day: 5 }],
  spendingBank: 'BBVA',
  limits: [{ categoryId: 'c1', limit: 200 }],
  target: 20000,
});

describe('validateOnboarding', () => {
  it('acepta una configuración completa (el banco se compara sin mayúsculas)', () => {
    expect(validateOnboarding(base())).toBeNull();
  });

  it('pide al menos un banco y sin repetir', () => {
    expect(validateOnboarding({ ...base(), banks: [] })).toBe('Elige al menos un banco');
    const i = base();
    i.banks.push({ name: 'bbva ', color: '#000000', cash: 0 });
    expect(validateOnboarding(i)).toBe('bbva  está repetido');
  });

  it('cada inversión va en uno de los bancos elegidos y con valor', () => {
    const i = base();
    i.assets[0].bank = 'ING';
    expect(validateOnboarding(i)).toBe('Elige en qué banco tienes Bitcoin');
    const j = base();
    j.assets[1].valueEur = 0;
    expect(validateOnboarding(j)).toBe('Indica cuánto vale hoy MSCI World');
  });

  it('solo admite valores que cotizan en euros', () => {
    const i = base();
    i.assets[1].priceSymbol = 'VOO';
    expect(validateOnboarding(i)).toBe('MSCI World no cotiza en euros');
  });

  it('las suscripciones necesitan un banco de cargo', () => {
    expect(validateOnboarding({ ...base(), spendingBank: null })).toBe('Elige de qué banco salen las suscripciones');
    expect(validateOnboarding({ ...base(), spendingBank: null, subscriptions: [] })).toBeNull();
  });

  it('valida la nómina y el objetivo', () => {
    expect(validateOnboarding({ ...base(), salary: { amount: 1500, day: 32, bank: 'BBVA' } })).toBe('Día de cobro no válido');
    expect(validateOnboarding({ ...base(), target: -1 })).toBe('Objetivo no válido');
  });
});

describe('openingDate', () => {
  it('es el último día del mes anterior', () => {
    expect(openingDate('2026-11-03')).toBe('2026-10-31');
    expect(openingDate('2026-03-01')).toBe('2026-02-28');
    expect(openingDate('2026-01-15')).toBe('2025-12-31');
  });
});
