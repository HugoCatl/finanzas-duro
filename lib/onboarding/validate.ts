import { EUR_SUFFIXES, type AssetKind } from './catalog';

export interface OnboardingBank { name: string; color: string; cash: number | null } // null: banco que ya tenías, no se toca el saldo
export interface OnboardingAsset {
  name: string; kind: AssetKind; coingeckoId: string | null; priceSymbol: string | null;
  bank: string; valueEur: number; investedEur: number | null;
}
export interface OnboardingInput {
  banks: OnboardingBank[];
  assets: OnboardingAsset[];
  salary: { amount: number; day: number; bank: string } | null;
  subscriptions: { name: string; amount: number; day: number }[];
  spendingBank: string | null; // de dónde salen las suscripciones
  limits: { categoryId: string; limit: number }[];
  target: number | null;
}

const MAX_EUR = 10_000_000_000;
const money = (n: unknown, min = 0) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= MAX_EUR;
const text = (s: unknown, max = 80) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max;
const day = (d: unknown) => Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 31;
const COLOR = /^#[0-9a-f]{6}$/i;
const COINGECKO = /^[a-z0-9-]{1,80}$/;
const SYMBOL = /^[A-Z0-9.^=-]{1,20}$/;

export const isEurSymbol = (s: string) => EUR_SUFFIXES.some((x) => s.toUpperCase().endsWith(x));

/** Comprueba lo que manda el asistente de bienvenida. Devuelve el primer error o null. */
export function validateOnboarding(i: OnboardingInput): string | null {
  if (!i || !Array.isArray(i.banks) || !Array.isArray(i.assets) || !Array.isArray(i.subscriptions) || !Array.isArray(i.limits)) return 'Datos no válidos';
  if (i.banks.length === 0) return 'Elige al menos un banco';
  if (i.banks.length > 30 || i.assets.length > 60 || i.subscriptions.length > 40 || i.limits.length > 60) return 'Demasiados elementos';

  const names = new Set<string>();
  for (const b of i.banks) {
    if (!text(b?.name, 40)) return 'Nombre de banco no válido';
    if (!COLOR.test(b.color)) return 'Color no válido';
    if (b.cash !== null && !money(b.cash)) return `Saldo no válido en ${b.name}`;
    const key = b.name.trim().toLowerCase();
    if (names.has(key)) return `${b.name} está repetido`;
    names.add(key);
  }
  const hasBank = (n: unknown) => typeof n === 'string' && names.has(n.trim().toLowerCase());

  for (const a of i.assets) {
    if (!text(a?.name)) return 'Nombre de inversión no válido';
    if (!hasBank(a.bank)) return `Elige en qué banco tienes ${a.name}`;
    if (!money(a.valueEur) || a.valueEur <= 0) return `Indica cuánto vale hoy ${a.name}`;
    if (a.investedEur !== null && !money(a.investedEur)) return `Importe invertido no válido en ${a.name}`;
    if (a.kind === 'crypto') {
      if (typeof a.coingeckoId !== 'string' || !COINGECKO.test(a.coingeckoId) || a.priceSymbol !== null) return `${a.name} no tiene precio automático`;
    } else if (a.kind === 'fund' || a.kind === 'stock') {
      if (typeof a.priceSymbol !== 'string' || !SYMBOL.test(a.priceSymbol) || !isEurSymbol(a.priceSymbol) || a.coingeckoId !== null) {
        return `${a.name} no cotiza en euros`;
      }
    } else return 'Tipo de inversión no válido';
  }

  if (i.salary !== null) {
    if (!money(i.salary?.amount) || i.salary.amount <= 0) return 'Importe de la nómina no válido';
    if (!day(i.salary.day)) return 'Día de cobro no válido';
    if (!hasBank(i.salary.bank)) return 'Elige dónde cobras la nómina';
  }
  for (const s of i.subscriptions) {
    if (!text(s?.name, 60) || !money(s.amount) || s.amount <= 0 || !day(s.day)) return `Revisa la suscripción ${s?.name ?? ''}`.trim();
  }
  if (i.subscriptions.length > 0 && !hasBank(i.spendingBank)) return 'Elige de qué banco salen las suscripciones';
  for (const l of i.limits) {
    if (typeof l?.categoryId !== 'string' || !money(l.limit)) return 'Límite no válido';
  }
  if (i.target !== null && (!money(i.target) || i.target <= 0)) return 'Objetivo no válido';
  return null;
}

/** Fecha de las posiciones iniciales: fin del mes anterior, para que no cuenten como invertido este mes ni muevan el efectivo de hoy. */
export function openingDate(today: string): string {
  const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
