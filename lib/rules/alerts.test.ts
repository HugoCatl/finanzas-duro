import { describe, it, expect } from 'vitest';
import { evaluateAlerts, type AlertInput } from './alerts';
import type { Category, Transaction } from '@/lib/types';

let seq = 0;
const tx = (p: Partial<Transaction> & Pick<Transaction, 'date' | 'amount'>): Transaction => ({
  id: `t${++seq}`, merchant: null, note: null, categoryId: 'A', accountId: null, source: 'manual', recurringId: null, ...p,
});
const cat = (id: string, monthlyLimit: number | null): Category => ({
  id, name: id === 'A' ? 'Ocio' : id, icon: 'circle', kind: 'expense', isFixed: false, monthlyLimit, sortOrder: 0,
});
const input = (p: Partial<AlertInput>): AlertInput => ({
  today: '2026-10-05', categories: [cat('A', 100)], transactions: [], settings: { bigExpenseThreshold: 100, timezone: 'Europe/Madrid', netWorthTarget: null }, ...p,
});
const kinds = (r: ReturnType<typeof evaluateAlerts>) => r.map((a) => `${a.kind}:${a.categoryId ?? '-'}:${a.threshold ?? '-'}`);

describe('evaluateAlerts', () => {
  it('categoría al 85% → aviso 80 de la categoría y del total', () => {
    const r = evaluateAlerts(input({ transactions: [tx({ date: '2026-10-02', amount: -85 })] }));
    expect(kinds(r)).toEqual(['category_threshold:A:80', 'total_threshold:-:80']);
    expect(r[0].title).toContain('Ocio');
  });
  it('categoría al 120% → solo el umbral más alto (100)', () => {
    const r = evaluateAlerts(input({ transactions: [tx({ date: '2026-10-02', amount: -120 })] }));
    expect(kinds(r)).toContain('category_threshold:A:100');
    expect(kinds(r)).not.toContain('category_threshold:A:80');
  });
  it('sin límites no hay avisos de umbral', () => {
    const r = evaluateAlerts(input({ categories: [cat('A', null)], transactions: [tx({ date: '2026-10-02', amount: -50 })] }));
    expect(r).toEqual([]);
  });
  it('el gasto en categorías sin límite también cuenta para el aviso del total', () => {
    const categories = [cat('A', 300), cat('R', null)];
    const transactions = [tx({ date: '2026-10-01', amount: -800, categoryId: 'R' })];
    expect(kinds(evaluateAlerts(input({ today: '2026-10-02', categories, transactions })))).toContain('total_threshold:-:100');
  });
  it('ritmo: desde el día 10, si la proyección supera el presupuesto', () => {
    const categories = [cat('A', 300)];
    const transactions = [tx({ date: '2026-10-02', amount: -200 })];
    expect(kinds(evaluateAlerts(input({ today: '2026-10-09', categories, transactions })))).not.toContain('pace:-:-');
    expect(kinds(evaluateAlerts(input({ today: '2026-10-15', categories, transactions })))).toContain('pace:-:-');
  });
  it('gastos sin categoría con más de 3 días', () => {
    const fresh = evaluateAlerts(input({ categories: [], transactions: [tx({ date: '2026-10-03', amount: -5, categoryId: null })] }));
    expect(fresh).toEqual([]);
    const old = evaluateAlerts(input({ categories: [], transactions: [tx({ date: '2026-10-01', amount: -5, categoryId: null })] }));
    expect(kinds(old)).toEqual(['uncategorized:-:-']);
  });
  it('gasto alto: uno por movimiento, con ref = id', () => {
    const big = tx({ date: '2026-10-04', amount: -150, categoryId: null });
    const r = evaluateAlerts(input({ categories: [], today: '2026-10-04', transactions: [big] }));
    expect(r).toEqual([expect.objectContaining({ kind: 'big_expense', ref: big.id })]);
  });
  it('ignora movimientos de otros meses', () => {
    expect(evaluateAlerts(input({ transactions: [tx({ date: '2026-09-30', amount: -500 })] }))).toEqual([]);
  });
});
