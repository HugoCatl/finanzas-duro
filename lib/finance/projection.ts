import type { Transaction } from '@/lib/types';
import { addMonths } from '@/lib/dates';
import { monthlySeries } from './month';
import { r2 } from './holdings';

/** Ahorro medio (ingresos − gastos) de los últimos `n` meses cerrados con movimientos; null si no hay ninguno. */
export function averageSaving(txs: Transaction[], currentMonth: string, n = 6): number | null {
  const rows = monthlySeries(txs, addMonths(currentMonth, -1), n).filter((r) => r.income > 0 || r.spent > 0);
  if (rows.length === 0) return null;
  return r2(rows.reduce((s, r) => s + r.income - r.spent, 0) / rows.length);
}

export interface ProjectionInput {
  cash: number; // efectivo y cuentas remuneradas: no se le aplica rentabilidad
  invested: number; // fondos, acciones y cripto
  monthly: number; // lo que ahorras cada mes; se supone que se invierte
  annualReturn: number; // 0.05 = 5 % anual
  years: number;
}

/** Patrimonio al final de cada año: lo invertido y lo que vas aportando crecen al interés compuesto mensual. */
export function projectNetWorth({ cash, invested, monthly, annualReturn, years }: ProjectionInput): number[] {
  const r = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const out = [r2(cash + invested)];
  let growing = invested;
  for (let m = 1; m <= years * 12; m++) {
    growing = growing * (1 + r) + monthly;
    if (m % 12 === 0) out.push(r2(cash + growing));
  }
  return out;
}

/** Rentabilidades anuales de los tres escenarios: si va mal, lo normal y si va bien. */
export const SCENARIOS = { low: 0.03, mid: 0.06, high: 0.08 } as const;

export interface ScenarioPoint { year: number; low: number; mid: number; high: number; contributed: number }

/** Lo invertido hoy más una aportación mensual fija, año a año, en los tres escenarios. */
export function projectScenarios(invested: number, monthly: number, years: number): ScenarioPoint[] {
  const run = (rate: number) => projectNetWorth({ cash: 0, invested, monthly, annualReturn: rate, years });
  const [low, mid, high] = [run(SCENARIOS.low), run(SCENARIOS.mid), run(SCENARIOS.high)];
  return mid.map((_, year) => ({ year, low: low[year], mid: mid[year], high: high[year], contributed: r2(invested + monthly * 12 * year) }));
}
