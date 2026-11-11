const MAX = 10_000_000_000;
const okMoney = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX;

export function validateLimit(limit: number | null): string | null {
  return limit === null || okMoney(limit) ? null : 'Límite no válido';
}

export function validateCategory(i: { name: string; kind: string; monthlyLimit: number | null }): string | null {
  if (typeof i.name !== 'string' || !i.name.trim()) return 'Ponle un nombre';
  if (i.kind !== 'expense' && i.kind !== 'income') return 'Tipo no válido';
  return validateLimit(i.monthlyLimit);
}

export function validateRecurring(i: {
  name: string; amount: number; kind: string; dayOfMonth: number;
  accountId?: string | null; transferAccountId?: string | null; holdingId?: string | null;
}): string | null {
  if (!['expense', 'income', 'transfer', 'plan'].includes(i.kind)) return 'Tipo no válido';
  if (i.kind === 'transfer' && (!i.accountId || !i.transferAccountId || i.accountId === i.transferAccountId)) {
    return 'Elige dos cuentas distintas';
  }
  if (i.kind === 'plan' && !i.holdingId) return 'Elige en qué inviertes';
  if (typeof i.name !== 'string' || !i.name.trim() || !(typeof i.amount === 'number' && i.amount > 0 && i.amount <= MAX)) {
    return 'Nombre e importe obligatorios';
  }
  if (!Number.isInteger(i.dayOfMonth) || i.dayOfMonth < 1 || i.dayOfMonth > 31) return 'Día entre 1 y 31';
  return null;
}
