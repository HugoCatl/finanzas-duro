import { describe, it, expect } from 'vitest';
import type { HoldingEvent } from '@/lib/types';
import { lastDays, positionSeries, valuationSeries } from './position-history';
import { flowAgeDays, positionFlows, xirr } from './xirr';

let seq = 0;
const ev = (p: Partial<HoldingEvent> & Pick<HoldingEvent, 'type' | 'date'>): HoldingEvent => ({
  id: String(++seq), holdingId: 'h', amountEur: 0, quantity: null, unitPriceEur: null, ...p,
});

describe('positionSeries', () => {
  const events = [
    ev({ type: 'buy', date: '2026-01-01', amountEur: 100, quantity: 10 }),
    ev({ type: 'buy', date: '2026-01-03', amountEur: 110, quantity: 10 }),
  ];

  it('valora cada día con las participaciones de ese día y el último cierre conocido', () => {
    const s = positionSeries(events, { '2026-01-01': 10, '2026-01-03': 11, '2026-01-04': 12 }, '2026-01-04');
    expect(s).toEqual([
      { date: '2026-01-01', value: 100, contributed: 100 },
      { date: '2026-01-02', value: 100, contributed: 100 }, // sin cierre ese día: el anterior
      { date: '2026-01-03', value: 220, contributed: 210 },
      { date: '2026-01-04', value: 240, contributed: 210 },
    ]);
  });

  it('sin historial de precios, el valor es lo aportado', () => {
    const s = positionSeries(events, null, '2026-01-03');
    expect(s.map((p) => p.value)).toEqual([100, 100, 210]);
  });

  it('antes del primer cierre usa lo aportado', () => {
    const s = positionSeries(events, { '2026-01-03': 11 }, '2026-01-03');
    expect(s[0].value).toBe(100);
    expect(s[2].value).toBe(220);
  });

  it('las ventas restan participaciones y aportado', () => {
    const s = positionSeries([...events, ev({ type: 'sell', date: '2026-01-04', amountEur: 120, quantity: 10 })],
      { '2026-01-01': 10, '2026-01-04': 12 }, '2026-01-04');
    expect(s.at(-1)).toEqual({ date: '2026-01-04', value: 120, contributed: 90 });
  });

  it('sin eventos no hay serie', () => {
    expect(positionSeries([], {}, '2026-01-01')).toEqual([]);
  });
});

describe('valuationSeries', () => {
  it('la valoración manda y lo que entra después se suma', () => {
    const s = valuationSeries([
      ev({ type: 'deposit', date: '2026-01-01', amountEur: 100 }),
      ev({ type: 'valuation', date: '2026-01-02', amountEur: 105 }),
      ev({ type: 'deposit', date: '2026-01-03', amountEur: 50 }),
    ], '2026-01-03');
    expect(s.map((p) => [p.value, p.contributed])).toEqual([[100, 100], [105, 100], [155, 150]]);
  });
});

describe('lastDays', () => {
  it('se queda con los últimos días', () => {
    const s = valuationSeries([ev({ type: 'deposit', date: '2026-01-01', amountEur: 1 })], '2026-01-10');
    expect(lastDays(s, 3).map((p) => p.date)).toEqual(['2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10']);
    expect(lastDays(s, null)).toHaveLength(10);
  });
});

describe('xirr', () => {
  it('un año exacto al 10 %', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 110 }])).toBeCloseTo(0.1, 4);
  });

  it('aportaciones en distintas fechas', () => {
    const r = xirr([
      { date: '2025-01-01', amount: -100 },
      { date: '2025-07-02', amount: -100 },
      { date: '2026-01-01', amount: 215 },
    ]);
    // 100 € un año y 100 € medio año para ganar 15 €: algo más del 10 % anual.
    expect(r).toBeGreaterThan(0.09);
    expect(r).toBeLessThan(0.11);
  });

  it('pérdidas dan negativo', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 80 }])).toBeCloseTo(-0.2, 4);
  });

  it('null si no hay flujos de los dos signos', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }])).toBeNull();
    expect(xirr([])).toBeNull();
  });
});

describe('positionFlows', () => {
  it('compras en negativo, ventas en positivo y el valor de hoy al final', () => {
    const flows = positionFlows([
      ev({ type: 'buy', date: '2026-01-02', amountEur: 100 }),
      ev({ type: 'valuation', date: '2026-01-03', amountEur: 120 }),
      ev({ type: 'sell', date: '2026-01-04', amountEur: 30 }),
    ], 90, '2026-02-01');
    expect(flows).toEqual([
      { date: '2026-01-02', amount: -100 },
      { date: '2026-01-04', amount: 30 },
      { date: '2026-02-01', amount: 90 },
    ]);
    expect(flowAgeDays(flows, '2026-02-01')).toBe(30);
  });
});
