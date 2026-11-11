import { describe, it, expect } from 'vitest';
import { monthlySummary } from './monthly-summary';
import type { Category, Transaction } from '@/lib/types';

let seq = 0;
const tx = (date: string, amount: number, categoryId: string | null = 'A'): Transaction => ({
  id: `t${++seq}`, date, amount, merchant: null, note: null, categoryId, accountId: null, source: 'manual', recurringId: null,
});
const cats: Category[] = [{ id: 'A', name: 'Supermercado', icon: 'circle', kind: 'expense', isFixed: false, monthlyLimit: null, sortOrder: 0 }];
const txs = [tx('2026-09-10', -200), tx('2026-10-01', 1500, null), tx('2026-10-05', -250), tx('2026-10-20', -50, null)];

describe('monthlySummary', () => {
  it('solo el último día del mes', () => {
    expect(monthlySummary({ today: '2026-10-30', categories: cats, transactions: txs, netWorthMonth: null })).toBeNull();
    expect(monthlySummary({ today: '2026-10-31', categories: cats, transactions: txs, netWorthMonth: null })).not.toBeNull();
  });

  it('gasto frente al mes pasado, ahorro, categoría principal y patrimonio', () => {
    const r = monthlySummary({ today: '2026-10-31', categories: cats, transactions: txs, netWorthMonth: 420 })!;
    expect(r.kind).toBe('monthly_summary');
    expect(r.ref).toBe('2026-10');
    expect(r.title).toBe('Tu octubre en resumen');
    expect(r.body).toMatch(/^Gastaste 300\s€ \(\+50 % que el mes pasado\), ingresaste 1500\s€ y ahorraste 1200\s€\. Donde más: Supermercado \(250\s€\)\. Patrimonio \+420\s€\.$/);
  });

  it('un mes sin movimientos no manda nada', () => {
    expect(monthlySummary({ today: '2026-11-30', categories: cats, transactions: txs, netWorthMonth: 10 })).toBeNull();
  });
});
