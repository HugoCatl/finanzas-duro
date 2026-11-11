import { addDays } from './dates';

const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eurWholeFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 });

/** `whole`: sin céntimos (objetivos y cifras redondas). */
export function eur(n: number, opts: { signed?: boolean; whole?: boolean } = {}): string {
  const value = Math.abs(n) < 0.005 ? 0 : n;
  const s = (opts.whole ? eurWholeFmt : eurFmt).format(value);
  return opts.signed && value > 0 ? `+${s}` : s;
}

const axisFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

/** Etiqueta corta para los ejes de los gráficos: "12,5 k€", "1,25 M€". */
export function eurAxis(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${axisFmt.format(n / 1_000_000)} M€`;
  if (abs >= 1_000) return `${axisFmt.format(n / 1_000)} k€`;
  return `${axisFmt.format(n)} €`;
}

/** Marcas de eje en pasos redondos (1, 2, 2,5 o 5 × 10ⁿ); la última queda por encima del máximo. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min, min + 1];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; ; t += step) {
    ticks.push(t);
    if (t > max - 1e-9 * step) break;
  }
  return ticks;
}

export function pct(n: number | null, opts: { signed?: boolean } = {}): string {
  if (n === null) return '—';
  const s = pctFmt.format(n);
  return opts.signed && n > 0 ? `+${s}` : s;
}

const taeFmt = new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Tipo de interés con dos decimales: 0,0225 → "2,25 %". */
export function tae(n: number): string {
  return taeFmt.format(n);
}

/** Acepta "12,50", "1.234,5", "12.5" o "3 €". Devuelve null si no es un número > 0. */
export function parseAmount(input: string, opts: { allowZero?: boolean } = {}): number | null {
  const clean = input
    .trim()
    .replace(/\s|€/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && (opts.allowZero ? n >= 0 : n > 0) ? Math.round(n * 100) / 100 : null;
}

const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const d = atNoon(`${month}-15`);
  if (style === 'short') {
    return new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' }).format(d).replace('.', '');
  }
  return capitalize(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d).replace(' de ', ' '));
}

export function dayLabel(date: string, today: string): string {
  if (date === today) return 'Hoy';
  if (date === addDays(today, -1)) return 'Ayer';
  return capitalize(new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(atNoon(date)));
}

/** "5 nov" */
export function dayMonth(date: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(atNoon(date)).replace('.', '');
}
