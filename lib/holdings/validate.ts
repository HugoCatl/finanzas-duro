import type { EventType, HoldingKind } from '@/lib/types';

export const EVENT_TYPES_BY_KIND: Record<HoldingKind, EventType[]> = {
  cash: ['deposit', 'withdrawal', 'balance_adjust'],
  savings: ['deposit', 'withdrawal', 'balance_adjust'],
  fund: ['deposit', 'withdrawal', 'valuation'],
  crypto: ['buy', 'sell'],
  stock: ['buy', 'sell'],
};

/** Un fondo con precio automático se lleva por participaciones, como una acción. */
export function eventTypesFor(kind: HoldingKind, priceSymbol: string | null): EventType[] {
  return kind === 'fund' && priceSymbol ? ['buy', 'sell'] : EVENT_TYPES_BY_KIND[kind];
}

const KINDS: HoldingKind[] = ['cash', 'savings', 'fund', 'crypto', 'stock'];
const MAX_EUR = 10_000_000_000;
const isDate = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const validAmount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_EUR;
const validQty = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e17;

export function validateNewHolding(i: {
  name: string; kind: HoldingKind; apyPct: number | null; coingeckoId: string | null; priceSymbol: string | null;
  date: string; amountEur: number; quantity: number | null;
}): string | null {
  if (!KINDS.includes(i.kind)) return 'Tipo no válido';
  if (typeof i.name !== 'string' || !i.name.trim()) return 'Ponle un nombre';
  if (!isDate(i.date) || !validAmount(i.amountEur)) return 'Datos no válidos';
  if (i.kind === 'savings' && i.apyPct !== null && !(Number.isFinite(i.apyPct) && i.apyPct >= 0 && i.apyPct < 100)) {
    return 'TAE no válido';
  }
  if (i.kind === 'crypto' && (!i.coingeckoId?.trim() || !validQty(i.quantity))) {
    return 'Para cripto indica el id de CoinGecko y la cantidad';
  }
  if (i.priceSymbol?.trim() && !/^[A-Za-z0-9.^=-]{1,20}$/.test(i.priceSymbol.trim())) return 'Código de Yahoo no válido';
  // Con precio automático el valor sale de las participaciones: hacen falta.
  if ((i.kind === 'stock' || (i.kind === 'fund' && i.priceSymbol?.trim())) && !validQty(i.quantity)) {
    return 'Indica el número de participaciones';
  }
  return null;
}

export function validateEvent(kind: HoldingKind, priceSymbol: string | null, i: {
  type: EventType; date: string; amountEur: number; quantity: number | null;
}): string | null {
  if (!eventTypesFor(kind, priceSymbol).includes(i.type)) return 'Movimiento no válido para esta posición';
  if (!isDate(i.date) || !validAmount(i.amountEur)) return 'Datos no válidos';
  if (i.amountEur === 0 && !ZERO_ALLOWED_EVENTS.includes(i.type)) return 'El importe debe ser mayor que 0';
  if ((i.type === 'buy' || i.type === 'sell') && !validQty(i.quantity)) return 'Indica la cantidad';
  return null;
}

/** Los eventos que fijan un saldo o valor pueden ser 0; el resto mueven dinero y deben ser > 0. */
export const ZERO_ALLOWED_EVENTS: EventType[] = ['balance_adjust', 'valuation'];
