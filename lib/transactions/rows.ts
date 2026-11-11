export interface TransactionInput {
  amount: number;
  kind: 'expense' | 'income';
  categoryId: string | null;
  date: string;
  merchant?: string | null;
  note?: string | null;
  accountId?: string | null;
}

export function validateInput(i: TransactionInput): string | null {
  if (i.kind !== 'expense' && i.kind !== 'income') return 'Tipo no válido';
  if (typeof i.amount !== 'number' || !(i.amount > 0) || i.amount > 10_000_000) return 'Importe no válido';
  if (typeof i.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(i.date)) return 'Fecha no válida';
  return null;
}

export function signedAmount(i: Pick<TransactionInput, 'amount' | 'kind'>): number {
  return i.kind === 'expense' ? -Math.abs(i.amount) : Math.abs(i.amount);
}

/** Fila completa para insertar. */
export function buildInsertRow(i: TransactionInput) {
  return {
    amount: signedAmount(i),
    category_id: i.categoryId,
    date: i.date,
    merchant: i.merchant?.trim() || null,
    note: i.note?.trim() || null,
    account_id: i.accountId ?? null,
  };
}

/** Parche de actualización: solo toca merchant, note y account_id si el llamante los envió. */
export function buildUpdatePatch(i: TransactionInput) {
  const patch: Record<string, unknown> = {
    amount: signedAmount(i),
    category_id: i.categoryId,
    date: i.date,
  };
  if (i.merchant !== undefined) patch.merchant = i.merchant?.trim() || null;
  if (i.note !== undefined) patch.note = i.note?.trim() || null;
  if (i.accountId !== undefined) patch.account_id = i.accountId;
  return patch;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number; // positivo
  date: string;
  note?: string | null;
}

export function validateTransfer(i: TransferInput): string | null {
  if (typeof i.fromAccountId !== 'string' || typeof i.toAccountId !== 'string' || !i.fromAccountId || !i.toAccountId) return 'Elige las dos cuentas';
  if (i.fromAccountId === i.toAccountId) return 'Elige dos cuentas distintas';
  if (typeof i.amount !== 'number' || !(i.amount > 0) || i.amount > 10_000_000) return 'Importe no válido';
  if (typeof i.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(i.date)) return 'Fecha no válida';
  return null;
}

/** Un traspaso se guarda como un movimiento negativo en la cuenta de origen con la de destino aparte. */
export function buildTransferRow(i: TransferInput) {
  return {
    amount: -Math.abs(i.amount),
    date: i.date,
    account_id: i.fromAccountId,
    transfer_account_id: i.toAccountId,
    category_id: null,
    merchant: i.note?.trim() || null,
  };
}

/** Lo que se guarda de un movimiento borrado para poder deshacerlo. */
export interface DeletedRow {
  id: string;
  date: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  category_id: string | null;
  account_id: string | null;
  transfer_account_id: string | null;
  recurring_id: string | null;
  source: string;
  import_ref: string | null;
  created_at: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCES = ['manual', 'recurring', 'apple_pay', 'import'];
const optId = (v: unknown) => v === null || (typeof v === 'string' && UUID.test(v));
const optText = (v: unknown, max: number) => v === null || (typeof v === 'string' && v.length <= max);

/** Recorta lo que devuelve la base de datos a las columnas que se pueden restaurar. */
export function toDeletedRow(r: Record<string, unknown>): DeletedRow {
  const s = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    id: String(r.id), date: String(r.date), amount: Number(r.amount), merchant: s(r.merchant), note: s(r.note),
    category_id: s(r.category_id), account_id: s(r.account_id), transfer_account_id: s(r.transfer_account_id),
    recurring_id: s(r.recurring_id), source: String(r.source), import_ref: s(r.import_ref), created_at: String(r.created_at),
  };
}

/** Lo que vuelve del cliente para deshacer no es de fiar: forma y tipos, campo a campo. */
export function validateDeletedRow(r: unknown): r is DeletedRow {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  return typeof x.id === 'string' && UUID.test(x.id)
    && typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date)
    && typeof x.amount === 'number' && Number.isFinite(x.amount) && x.amount !== 0 && Math.abs(x.amount) <= 10_000_000
    && optText(x.merchant, 200) && optText(x.note, 500) && optText(x.import_ref, 200)
    && optId(x.category_id) && optId(x.account_id) && optId(x.transfer_account_id) && optId(x.recurring_id)
    && typeof x.source === 'string' && SOURCES.includes(x.source)
    && typeof x.created_at === 'string' && !Number.isNaN(Date.parse(x.created_at));
}
