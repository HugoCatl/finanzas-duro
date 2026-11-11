import { describe, it, expect } from 'vitest';
import { dueRecurring, effectiveDate, planBuy, recurringKind, upcomingRecurring } from './recurring';
import type { Recurring, Transaction } from '@/lib/types';

const rec = (p: Partial<Recurring>): Recurring => ({
  id: 'r', name: 'Alquiler', amount: -700, categoryId: null, accountId: null, dayOfMonth: 5, active: true, ...p,
});
const tx = (p: Partial<Transaction>): Transaction => ({
  id: 't', date: '2026-10-05', amount: -700, merchant: null, note: null, categoryId: null, accountId: null,
  source: 'recurring', recurringId: 'r', ...p,
});

describe('dueRecurring', () => {
  it('no vence antes de su día', () => {
    expect(dueRecurring([rec({})], [], '2026-10-04')).toEqual([]);
  });
  it('vence su día y hasta 2 días después si aún no se ha apuntado', () => {
    expect(dueRecurring([rec({})], [], '2026-10-05')).toHaveLength(1);
    expect(dueRecurring([rec({})], [], '2026-10-07')).toHaveLength(1);
  });
  it('fuera de la ventana no se crea (alta a mitad de mes o borrado a mano)', () => {
    expect(dueRecurring([rec({})], [], '2026-10-08')).toEqual([]);
    expect(dueRecurring([rec({})], [], '2026-10-20')).toEqual([]);
  });
  it('día 1: vence el 1, el 3 todavía, el 4 ya no', () => {
    const r = rec({ dayOfMonth: 1 });
    expect(dueRecurring([r], [], '2026-10-01')).toHaveLength(1);
    expect(dueRecurring([r], [], '2026-10-03')).toHaveLength(1);
    expect(dueRecurring([r], [], '2026-10-04')).toEqual([]);
  });
  it('no se duplica si ya existe este mes', () => {
    expect(dueRecurring([rec({})], [tx({})], '2026-10-06')).toEqual([]);
  });
  it('el de mes anterior no cuenta', () => {
    expect(dueRecurring([rec({})], [tx({ date: '2026-09-05' })], '2026-10-05')).toHaveLength(1);
  });
  it('día 31 en febrero vence el 28 (y 29 en bisiesto) y hasta 2 días después', () => {
    const r = rec({ dayOfMonth: 31 });
    expect(dueRecurring([r], [], '2026-02-27')).toEqual([]);
    expect(dueRecurring([r], [], '2026-02-28')).toHaveLength(1);
    expect(dueRecurring([r], [], '2028-02-28')).toEqual([]);
    expect(dueRecurring([r], [], '2028-02-29')).toHaveLength(1);
  });
  it('día 31 en mes de 30 días vence el 30', () => {
    const r = rec({ dayOfMonth: 31 });
    expect(dueRecurring([r], [], '2026-04-29')).toEqual([]);
    expect(dueRecurring([r], [], '2026-04-30')).toHaveLength(1);
  });
  it('borrado el día de vencimiento: no reaparece pasada la ventana', () => {
    expect(dueRecurring([rec({})], [], '2026-10-06')).toHaveLength(1); // aún dentro de la ventana
    expect(dueRecurring([rec({})], [], '2026-10-08')).toEqual([]);
  });
  it('inactivo nunca vence', () => {
    expect(dueRecurring([rec({ active: false })], [], '2026-10-05')).toEqual([]);
  });
});

describe('effectiveDate', () => {
  it('fecha en el mes con día recortado', () => {
    expect(effectiveDate(rec({ dayOfMonth: 5 }), '2026-10')).toBe('2026-10-05');
    expect(effectiveDate(rec({ dayOfMonth: 31 }), '2026-02')).toBe('2026-02-28');
  });
});

describe('fijos de traspaso y planes de inversión', () => {
  it('recurringKind distingue los cuatro tipos', () => {
    expect(recurringKind({ amount: -700, transferAccountId: 'b', holdingId: null })).toBe('transfer');
    expect(recurringKind({ amount: -50, transferAccountId: null, holdingId: 'btc' })).toBe('plan');
    expect(recurringKind({ amount: -5.5 })).toBe('expense');
    expect(recurringKind({ amount: 1300 })).toBe('income');
  });
  it('planBuy calcula participaciones al último precio y no compra sin precio', () => {
    expect(planBuy(50, 62500)).toEqual({ quantity: 0.0008, unitPriceEur: 62500 });
    expect(planBuy(50, undefined)).toBeNull();
    expect(planBuy(50, 0)).toBeNull();
  });
  it('un plan ya comprado este mes (evento con su recurringId) no vuelve a salir', () => {
    const plan = { id: 'p', name: 'BTC', amount: -50, categoryId: null, accountId: 'tr', dayOfMonth: 2, active: true, holdingId: 'btc' };
    expect(dueRecurring([plan], [], '2026-11-03').map((r) => r.id)).toEqual(['p']);
    expect(dueRecurring([plan], [{ recurringId: 'p', date: '2026-11-02' }], '2026-11-03')).toEqual([]);
  });
});

describe('upcomingRecurring', () => {
  it('ordena por la próxima fecha: lo que ya pasó este mes salta al siguiente', () => {
    const r = (id: string, dayOfMonth: number, active = true) =>
      ({ id, name: id, amount: -1, categoryId: null, accountId: null, dayOfMonth, active });
    const out = upcomingRecurring([r('a', 2), r('b', 25), r('c', 3), r('d', 10, false)], '2026-11-03', 3);
    expect(out.map((x) => [x.recurring.id, x.date])).toEqual([['c', '2026-11-03'], ['b', '2026-11-25'], ['a', '2026-12-02']]);
  });
});
