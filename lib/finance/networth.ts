import type { Snapshot } from '@/lib/types';
import { addDays, monthOf } from '@/lib/dates';
import { r2 } from './holdings';

export interface NetWorthChange { day: number | null; month: number | null; year: number | null }

function valueAt(snapshots: Snapshot[], date: string): number | null {
  let best: Snapshot | null = null;
  for (const s of snapshots) if (s.date <= date && (!best || s.date > best.date)) best = s;
  return best ? best.netWorth : null;
}

export function netWorthChange(snapshots: Snapshot[], current: number, today: string): NetWorthChange {
  const diff = (ref: number | null) => (ref === null ? null : r2(current - ref));
  const endPrevMonth = addDays(`${monthOf(today)}-01`, -1);
  const endPrevYear = `${Number(today.slice(0, 4)) - 1}-12-31`;
  return {
    day: diff(valueAt(snapshots, addDays(today, -1))),
    month: diff(valueAt(snapshots, endPrevMonth)),
    year: diff(valueAt(snapshots, endPrevYear)),
  };
}
