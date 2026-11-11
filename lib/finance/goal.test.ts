import { describe, it, expect } from 'vitest';
import type { Category, Recurring } from '@/lib/types';
import { goalProgress, monthlyPace } from './goal';

const cat = (id: string, monthlyLimit: number | null, kind: Category['kind'] = 'expense'): Category => ({
  id, name: id, icon: 'circle', kind, isFixed: false, monthlyLimit, sortOrder: 0,
});
const rec = (amount: number, categoryId: string | null, active = true): Recurring => ({
  id: `${amount}`, name: 'x', amount, categoryId, accountId: null, dayOfMonth: 1, active,
});

describe('monthlyPace', () => {
  it('ingresos fijos menos límites, sin contar dos veces los fijos de una categoría con límite', () => {
    const categories = [cat('sus', 31), cat('sup', 60), cat('nom', null, 'income')];
    const recurring = [rec(1300, 'nom'), rec(-21.78, 'sus'), rec(-5.5, 'sus'), rec(-10, null), rec(-999, 'sup', false)];
    expect(monthlyPace(recurring, categories)).toBe(1300 - 31 - 60 - 10);
  });
  it('si los fijos superan el límite, cuentan los fijos', () => {
    expect(monthlyPace([rec(100, null), rec(-40, 'sus')], [cat('sus', 30)])).toBe(60);
  });
});

describe('goalProgress', () => {
  it('calcula lo que falta y el mes estimado', () => {
    expect(goalProgress(20000, 10700, 1000, '2026-11-03')).toEqual({ pct: 0.535, remaining: 9300, months: 10, eta: '2027-09' });
  });
  it('objetivo alcanzado o sin ritmo positivo: sin fecha', () => {
    expect(goalProgress(20000, 21000, 1000, '2026-11-03')).toMatchObject({ pct: 1, remaining: 0, eta: null });
    expect(goalProgress(20000, 5000, 0, '2026-11-03')).toMatchObject({ eta: null, months: null });
  });
});
