import { describe, it, expect } from 'vitest';
import { averageSaving, projectNetWorth } from './projection';
import type { Transaction } from '@/lib/types';

let seq = 0;
const tx = (date: string, amount: number): Transaction => ({
  id: `t${++seq}`, date, amount, merchant: null, note: null, categoryId: null, accountId: null, source: 'manual', recurringId: null,
});

describe('averageSaving', () => {
  it('media de los meses cerrados con movimientos, sin contar el actual', () => {
    const txs = [tx('2026-09-01', 2000), tx('2026-09-10', -1500), tx('2026-10-01', 2000), tx('2026-10-10', -1000), tx('2026-11-02', -5000)];
    expect(averageSaving(txs, '2026-11')).toBe(750);
  });
  it('sin historial no hay media', () => {
    expect(averageSaving([tx('2026-11-02', -50)], '2026-11')).toBeNull();
  });
});

describe('projectNetWorth', () => {
  it('sin rentabilidad suma aportaciones', () => {
    expect(projectNetWorth({ cash: 1000, invested: 0, monthly: 100, annualReturn: 0, years: 2 })).toEqual([1000, 2200, 3400]);
  });
  it('lo invertido crece al interés compuesto y el efectivo no', () => {
    const [start, y1] = projectNetWorth({ cash: 500, invested: 1000, monthly: 0, annualReturn: 0.1, years: 1 });
    expect(start).toBe(1500);
    expect(y1).toBe(1600);
  });
});
