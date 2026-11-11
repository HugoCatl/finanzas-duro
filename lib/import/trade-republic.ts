import { r2 } from '@/lib/finance/holdings';
import { csvRecords } from './csv';

/** Movimiento de gasto o ingreso; `category` es el nombre de la categoría a buscar entre las del usuario. */
export interface ImportTransaction {
  ref: string;
  date: string;
  amount: number;
  merchant: string | null;
  category: string | null;
}

export interface ImportAsset { symbol: string; isin: string | null; name: string; crypto: boolean }

/** Compra/venta de un valor. `amountEur` 0 = entrada sin coste (p. ej. cripto traída de otra cartera). */
export interface ImportTrade {
  ref: string;
  date: string;
  type: 'buy' | 'sell';
  amountEur: number;
  quantity: number;
  asset: ImportAsset;
}

export interface Counterparty { key: string; name: string; count: number; own: boolean }

export interface TradeRepublicImport {
  transactions: ImportTransaction[];
  trades: ImportTrade[];
  counterparties: Counterparty[];
  skipped: { old: number; ownTransfers: number; unknown: number };
}

export const REQUIRED_COLUMNS = ['date', 'type', 'amount', 'transaction_id'];

// Merchant Category Codes de las tarjetas → categorías de la app.
const MCC_CATEGORY: Record<string, string> = {
  '5411': 'Supermercado', '5499': 'Supermercado',
  '5812': 'Comida fuera', '5813': 'Comida fuera', '5814': 'Comida fuera',
  '4111': 'Transporte', '4121': 'Transporte', '4131': 'Transporte', '5541': 'Transporte', '5542': 'Transporte',
  '5651': 'Ropa', '5691': 'Ropa', '5699': 'Ropa',
  '5912': 'Salud', '8011': 'Salud', '8021': 'Salud',
  '7832': 'Ocio', '7922': 'Ocio', '7991': 'Ocio', '5816': 'Ocio',
  '5734': 'Suscripciones', '5815': 'Suscripciones', '5817': 'Suscripciones', '5818': 'Suscripciones', '4899': 'Suscripciones',
};

// Comercios donde se compra la merienda (por delante del MCC).
const MERCHANT_RULES: [RegExp, string][] = [[/DULCES ISA|PEAKMONCS|CHARTER VIVER/i, 'Merienda']];

export function cardCategory(merchant: string, mcc: string): string {
  for (const [re, category] of MERCHANT_RULES) if (re.test(merchant)) return category;
  return MCC_CATEGORY[mcc] ?? 'Otros';
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const tokens = (s: string) => new Set(norm(s).split(/[^A-Z]+/).filter((t) => t.length >= 3));
const num = (s: string | undefined) => (s ? Number(s) : 0);
const isTransfer = (type: string) => type.startsWith('TRANSFER_');

/** Contrapartes de los traspasos. Se suponen tuyas las que comparten al menos dos palabras con la más frecuente. */
function counterpartiesOf(rows: Record<string, string>[], own?: string[]): Counterparty[] {
  const map = new Map<string, Counterparty>();
  for (const r of rows) {
    if (!isTransfer(r.type)) continue;
    const name = r.counterparty_name || 'Desconocido';
    const key = r.counterparty_iban || norm(name);
    const c = map.get(key) ?? { key, name, count: 0, own: false };
    c.count++;
    map.set(key, c);
  }
  const list = [...map.values()].sort((a, b) => b.count - a.count);
  if (own) {
    const set = new Set(own);
    for (const c of list) c.own = set.has(c.key);
  } else if (list[0]) {
    const mine = tokens(list[0].name);
    for (const c of list) c.own = [...tokens(c.name)].filter((t) => mine.has(t)).length >= 2;
  }
  return list;
}

/**
 * Lee el CSV de "Exportar transacciones" de Trade Republic.
 * `own`: claves de contrapartes que son cuentas tuyas (sus traspasos se ignoran); sin él se deducen.
 */
export function parseTradeRepublic(text: string, opts: { since: string; own?: string[] }): TradeRepublicImport {
  const rows = csvRecords(text);
  if (rows.length > 0 && REQUIRED_COLUMNS.some((c) => !(c in rows[0]))) {
    throw new Error('No parece un extracto de Trade Republic');
  }
  const counterparties = counterpartiesOf(rows, opts.own);
  const ownKeys = new Set(counterparties.filter((c) => c.own).map((c) => c.key));
  const out: TradeRepublicImport = { transactions: [], trades: [], counterparties, skipped: { old: 0, ownTransfers: 0, unknown: 0 } };

  for (const r of rows) {
    const date = r.date || r.datetime?.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) { out.skipped.unknown++; continue; }
    if (date < opts.since) { out.skipped.old++; continue; }
    const ref = `tr:${r.transaction_id}`;
    const amount = num(r.amount);
    const fee = Math.abs(num(r.fee));
    const tax = Math.abs(num(r.tax));
    const type = r.type;

    if (type.startsWith('CARD_TRANSACTION')) {
      if (amount === 0) continue;
      const merchant = r.name || r.description || null;
      out.transactions.push({ ref, date, amount: r2(amount), merchant, category: cardCategory(merchant ?? '', r.mcc_code ?? '') });
    } else if (type === 'INTEREST_PAYMENT' || type === 'DIVIDEND') {
      const net = r2(amount - tax);
      if (net === 0) continue;
      out.transactions.push({
        ref, date, amount: net, category: 'Intereses',
        merchant: type === 'DIVIDEND' ? `Dividendo ${r.name || r.symbol}` : 'Intereses Trade Republic',
      });
    } else if (isTransfer(type)) {
      const key = r.counterparty_iban || norm(r.counterparty_name || 'Desconocido');
      if (ownKeys.has(key)) { out.skipped.ownTransfers++; continue; }
      if (amount === 0) continue;
      out.transactions.push({
        ref, date, amount: r2(amount), merchant: r.counterparty_name || null, category: amount > 0 ? 'Otros ingresos' : 'Otros',
      });
    } else if (type === 'BUY' || type === 'SELL' || type === 'FREE_RECEIPT') {
      const quantity = Math.abs(num(r.shares));
      if (!(quantity > 0) || !r.symbol) { out.skipped.unknown++; continue; }
      const crypto = r.asset_class === 'CRYPTO' || r.symbol === 'BTC';
      const asset: ImportAsset = { symbol: r.symbol, isin: crypto ? null : r.symbol, name: r.name || r.symbol, crypto };
      const amountEur = type === 'FREE_RECEIPT' ? 0 : type === 'BUY' ? r2(Math.abs(amount) + fee) : r2(Math.max(0, Math.abs(amount) - fee - tax));
      out.trades.push({ ref, date, type: type === 'SELL' ? 'sell' : 'buy', amountEur, quantity, asset });
    } else {
      out.skipped.unknown++;
    }
  }
  return out;
}
