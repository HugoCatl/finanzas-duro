import { describe, it, expect } from 'vitest';
import { learnedCategories, learnedCategory, normalizeMerchant } from './learn';

describe('normalizeMerchant', () => {
  it('quita tildes, mayúsculas, números y signos', () => {
    expect(normalizeMerchant('MERCADONA 1234*SEVILLA')).toBe('mercadona sevilla');
    expect(normalizeMerchant('  Panadería   Pepe  ')).toBe('panaderia pepe');
    expect(normalizeMerchant(null)).toBe('');
    expect(normalizeMerchant('1234')).toBe('');
  });
});

describe('learnedCategories', () => {
  const tx = (merchant: string | null, categoryId: string | null, date: string, createdAt?: string) => ({ merchant, categoryId, date, createdAt });

  it('recuerda la última categoría usada con cada comercio', () => {
    const learned = learnedCategories([
      tx('Mercadona', 'super', '2026-10-01'),
      tx('MERCADONA', 'otros', '2026-10-05'),
      tx('mercadona', 'comida', '2026-10-03'),
      tx('Bar Manolo', 'comida', '2026-10-02', '2026-10-02T10:00:00Z'),
      tx('Bar Manolo', 'ocio', '2026-10-02', '2026-10-02T12:00:00Z'),
    ]);
    expect(learned).toEqual({ mercadona: 'otros', 'bar manolo': 'ocio' });
  });

  it('ignora movimientos sin comercio o sin categoría', () => {
    expect(learnedCategories([tx(null, 'super', '2026-10-01'), tx('Zara', null, '2026-10-01')])).toEqual({});
  });

  it('busca por comercio normalizado', () => {
    const learned = { mercadona: 'super' };
    expect(learnedCategory(learned, 'MERCADONA')).toBe('super');
    expect(learnedCategory(learned, 'Lidl')).toBeNull();
    expect(learnedCategory(learned, '')).toBeNull();
  });
});
