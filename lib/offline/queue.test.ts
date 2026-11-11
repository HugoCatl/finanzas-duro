import { describe, it, expect } from 'vitest';
import { dequeue, enqueue, isOfflineRef, readQueue, QUEUE_KEY } from './queue';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const input = { amount: 4.5, kind: 'expense' as const, categoryId: null, date: '2026-11-04', merchant: 'Café', accountId: null };
const ref = (n: number) => `offline:00000000-0000-4000-8000-00000000000${n}`;

describe('cola sin conexión', () => {
  it('guarda en orden y quita por referencia', () => {
    const s = memory();
    enqueue(s, { input }, ref(1));
    enqueue(s, { type: 'transfer', input: { fromAccountId: 'a', toAccountId: 'b', amount: 10, date: '2026-11-04' } }, ref(2));
    expect(readQueue(s).map((p) => [p.type ?? 'transaction', p.input.amount])).toEqual([['transaction', 4.5], ['transfer', 10]]);
    expect(dequeue(s, ref(1)).map((p) => p.ref)).toEqual([ref(2)]);
  });
  it('ignora datos corruptos', () => {
    const s = memory();
    s.setItem(QUEUE_KEY, '{no es json');
    expect(readQueue(s)).toEqual([]);
    s.setItem(QUEUE_KEY, JSON.stringify([{ ref: 'x', input }]));
    expect(readQueue(s)).toEqual([]);
  });
  it('solo acepta referencias offline:<uuid>', () => {
    expect(isOfflineRef(ref(1))).toBe(true);
    expect(isOfflineRef('tr:123')).toBe(false);
    expect(isOfflineRef('offline:abc')).toBe(false);
  });
});
