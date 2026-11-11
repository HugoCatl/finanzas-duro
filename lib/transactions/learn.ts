import type { Transaction } from '@/lib/types';

/**
 * Comercio normalizado para reconocerlo aunque cambie la tienda o el formato del banco:
 * sin tildes, mayúsculas, números ni signos ("MERCADONA 1234*SEVILLA" → "mercadona sevilla").
 */
export function normalizeMerchant(merchant: string | null | undefined): string {
  return (merchant ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Categoría que usaste la última vez con cada comercio (clave: comercio normalizado). */
export function learnedCategories(
  transactions: Pick<Transaction, 'merchant' | 'categoryId' | 'date' | 'createdAt'>[],
): Record<string, string> {
  const latest = new Map<string, { categoryId: string; date: string; createdAt: string }>();
  for (const t of transactions) {
    const key = normalizeMerchant(t.merchant);
    if (!key || !t.categoryId) continue;
    const prev = latest.get(key);
    const createdAt = t.createdAt ?? '';
    if (!prev || t.date > prev.date || (t.date === prev.date && createdAt > prev.createdAt)) {
      latest.set(key, { categoryId: t.categoryId, date: t.date, createdAt });
    }
  }
  return Object.fromEntries([...latest].map(([k, v]) => [k, v.categoryId]));
}

export function learnedCategory(learned: Record<string, string>, merchant: string | null | undefined): string | null {
  const key = normalizeMerchant(merchant);
  return key ? learned[key] ?? null : null;
}
