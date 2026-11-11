import { describe, it, expect } from 'vitest';
import { daysBetween, addDays, monthOf, daysInMonth, addMonths, dayOfMonth, todayIn } from './dates';

describe('dates', () => {
  it('daysBetween', () => {
    expect(daysBetween('2025-01-01', '2026-01-01')).toBe(365);
    expect(daysBetween('2026-03-10', '2026-03-01')).toBe(-9);
  });
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('monthOf / dayOfMonth', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
    expect(dayOfMonth('2026-10-09')).toBe(9);
  });
  it('daysInMonth', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });
  it('addMonths', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', 3)).toBe('2027-01');
  });
  it('todayIn usa la zona horaria', () => {
    // 23:30 UTC del 31-dic = 00:30 del 1-ene en Madrid
    expect(todayIn('Europe/Madrid', new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});
