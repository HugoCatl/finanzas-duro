import { describe, it, expect } from 'vitest';
import { netWorthChange } from './networth';
import type { Snapshot } from '@/lib/types';

const s = (date: string, netWorth: number): Snapshot => ({ date, netWorth, byAccount: {}, byKind: {} });

describe('netWorthChange', () => {
  it('compara con ayer, con el cierre del mes anterior y con el del año anterior', () => {
    const snaps = [s('2025-12-31', 10000), s('2026-09-30', 12000), s('2026-10-28', 12500)];
    expect(netWorthChange(snaps, 13000, '2026-10-29')).toEqual({ day: 500, month: 1000, year: 3000 });
  });
  it('usa la foto más reciente anterior o igual a la fecha de referencia', () => {
    const snaps = [s('2026-09-25', 11000)];
    expect(netWorthChange(snaps, 12000, '2026-10-29')).toEqual({ day: 1000, month: 1000, year: null });
  });
  it('sin fotos → null', () => {
    expect(netWorthChange([], 1, '2026-10-29')).toEqual({ day: null, month: null, year: null });
  });
});
