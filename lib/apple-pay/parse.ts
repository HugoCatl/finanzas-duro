import { createHash } from 'node:crypto';
import type { Account } from '@/lib/types';
import { parseAmount } from '@/lib/format';
import { normalizeMerchant } from '@/lib/transactions/learn';

export interface ApplePayPayment { amount: number; merchant: string | null; card: string | null }

/** El token se guarda solo como hash: quien lea la tabla no puede usarlo. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '');
  return m && m[1].length >= 20 && m[1].length <= 200 ? m[1] : null;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Lo que manda el atajo de iOS al pagar con Wallet. El importe llega como texto
 * con el formato del iPhone ("12,50 €", "€12.50") o como número.
 */
export function parseApplePay(body: unknown): ApplePayPayment | string {
  if (!body || typeof body !== 'object') return 'Cuerpo no válido';
  const b = body as Record<string, unknown>;
  const raw = typeof b.amount === 'number' ? String(b.amount) : typeof b.amount === 'string' ? b.amount.replace(/[^\d.,-]/g, '') : '';
  const amount = parseAmount(raw.replace(/^-/, ''));
  if (amount === null || amount > 100_000) return 'Importe no válido';
  return { amount, merchant: text(b.merchant, 80), card: text(b.card, 80) };
}

/** La cuenta cuyo nombre aparece en el nombre de la tarjeta ("Revolut Mastercard" → Revolut); la más larga gana. */
export function matchAccount(accounts: Pick<Account, 'id' | 'name'>[], card: string | null): string | null {
  const c = normalizeMerchant(card);
  if (!c) return null;
  const hit = accounts
    .map((a) => ({ id: a.id, key: normalizeMerchant(a.name) }))
    .filter((a) => a.key && ` ${c} `.includes(` ${a.key} `))
    .sort((a, b) => b.key.length - a.key.length)[0];
  return hit?.id ?? null;
}
