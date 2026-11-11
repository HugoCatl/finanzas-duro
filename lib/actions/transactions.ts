'use server';

import { revalidatePath } from 'next/cache';
import { normalizeMerchant } from '@/lib/transactions/learn';
import { isOfflineRef } from '@/lib/offline/queue';
import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ownedError } from '@/lib/supabase/owned';
import { runAlertsForUser } from '@/lib/alerts/run';
import type { AlertKind } from '@/lib/rules/alerts';
import {
  buildInsertRow, buildTransferRow, buildUpdatePatch, toDeletedRow, validateDeletedRow, validateInput, validateTransfer,
  type DeletedRow, type TransactionInput, type TransferInput,
} from '@/lib/transactions/rows';
import type { ActionResult } from '@/lib/types';

export type { DeletedRow, TransactionInput, TransferInput };

const NOT_FOUND = 'No se encontró el movimiento';

/** Evalúa los avisos y devuelve el título del primero nuevo sobre el gasto (para que Duro lo diga), si lo hay. */
async function runAlertsSafely(userId: string): Promise<string | null> {
  try {
    const created = await runAlertsForUser(createAdminClient(), userId);
    return created.find((c) => SPEND_WARNINGS.has(c.kind))?.title ?? null;
  } catch (e) {
    console.error('Error evaluando avisos', e);
    return null;
  }
}
const SPEND_WARNINGS = new Set<AlertKind>(['category_threshold', 'total_threshold', 'pace', 'big_expense']);

const SAVE_FAILED = 'No se pudo guardar';

/** Categoría (del mismo tipo que el movimiento) y cuenta, si se indican, deben ser del usuario. */
async function referenceError(supabase: SupabaseClient, input: TransactionInput): Promise<string | null> {
  return (
    (await ownedError(supabase, 'categories', input.categoryId, 'Categoría no válida', input.kind)) ??
    (await ownedError(supabase, 'accounts', input.accountId, 'Cuenta no válida'))
  );
}

function dbFail(e: unknown): ActionResult {
  console.error('Error de base de datos', e);
  return { ok: false, error: SAVE_FAILED };
}

/** `offlineRef` (los apuntados sin conexión) hace la subida idempotente: repetirla no duplica. */
export async function createTransaction(input: TransactionInput, offlineRef?: string): Promise<ActionResult & { warning?: string | null }> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, error: invalid };
  if (offlineRef !== undefined && !isOfflineRef(offlineRef)) return { ok: false, error: 'Datos no válidos' };
  const { supabase, user } = await requireUser();
  const badRef = await referenceError(supabase, input);
  if (badRef) return { ok: false, error: badRef };
  const row = { ...buildInsertRow(input), source: 'manual', import_ref: offlineRef ?? null };
  const { error } = offlineRef
    ? await supabase.from('transactions').upsert(row, { onConflict: 'user_id,import_ref', ignoreDuplicates: true })
    : await supabase.from('transactions').insert(row);
  if (error) return dbFail(error);
  const warning = await runAlertsSafely(user.id);
  revalidatePath('/', 'layout');
  return { ok: true, warning };
}

export async function createTransfer(input: TransferInput, offlineRef?: string): Promise<ActionResult> {
  const invalid = validateTransfer(input);
  if (invalid) return { ok: false, error: invalid };
  if (offlineRef !== undefined && !isOfflineRef(offlineRef)) return { ok: false, error: 'Datos no válidos' };
  const { supabase } = await requireUser();
  const badRef =
    (await ownedError(supabase, 'accounts', input.fromAccountId, 'Cuenta no válida')) ??
    (await ownedError(supabase, 'accounts', input.toAccountId, 'Cuenta no válida'));
  if (badRef) return { ok: false, error: badRef };
  const row = { ...buildTransferRow(input), source: 'manual', import_ref: offlineRef ?? null };
  const { error } = offlineRef
    ? await supabase.from('transactions').upsert(row, { onConflict: 'user_id,import_ref', ignoreDuplicates: true })
    : await supabase.from('transactions').insert(row);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateTransfer(id: string, input: TransferInput): Promise<ActionResult> {
  const invalid = validateTransfer(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase } = await requireUser();
  const badRef =
    (await ownedError(supabase, 'accounts', input.fromAccountId, 'Cuenta no válida')) ??
    (await ownedError(supabase, 'accounts', input.toAccountId, 'Cuenta no válida'));
  if (badRef) return { ok: false, error: badRef };
  const { data, error } = await supabase.from('transactions').update(buildTransferRow(input))
    .eq('id', id).not('transfer_account_id', 'is', null).select('id');
  if (error) return dbFail(error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<ActionResult> {
  const invalid = validateInput(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase, user } = await requireUser();
  const badRef = await referenceError(supabase, input);
  if (badRef) return { ok: false, error: badRef };
  const { data, error } = await supabase.from('transactions').update(buildUpdatePatch(input)).eq('id', id).select('id');
  if (error) return dbFail(error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  await runAlertsSafely(user.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Borra y devuelve la fila, para poder deshacerlo con `restoreTransaction`. */
export async function deleteTransaction(id: string): Promise<ActionResult & { deleted?: DeletedRow }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('*');
  if (error) return dbFail(error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };
  revalidatePath('/', 'layout');
  return { ok: true, deleted: toDeletedRow(data[0]) };
}

/** Deshacer un borrado: vuelve a insertar la fila tal cual, si todo lo que referencia sigue siendo tuyo. */
export async function restoreTransaction(row: DeletedRow): Promise<ActionResult> {
  if (!validateDeletedRow(row)) return { ok: false, error: 'No se pudo deshacer' };
  const { supabase } = await requireUser();
  const badRef =
    (await ownedError(supabase, 'categories', row.category_id, 'La categoría ya no existe')) ??
    (await ownedError(supabase, 'accounts', row.account_id, 'La cuenta ya no existe')) ??
    (await ownedError(supabase, 'accounts', row.transfer_account_id, 'La cuenta ya no existe')) ??
    (await ownedError(supabase, 'recurring', row.recurring_id, 'El fijo ya no existe'));
  if (badRef) return { ok: false, error: badRef };
  const { error } = await supabase.from('transactions').insert(toDeletedRow({ ...row })); // solo las columnas conocidas
  if (error && error.code !== '23505') return dbFail(error); // 23505: ya estaba restaurado
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Categoriza un movimiento y, de paso, los demás sin categoría del mismo comercio. Devuelve cuántos más. */
export async function categorizeTransaction(id: string, categoryId: string): Promise<ActionResult & { also?: number }> {
  const { supabase, user } = await requireUser();
  const badCategory = await ownedError(supabase, 'categories', categoryId, 'Categoría no válida');
  if (badCategory) return { ok: false, error: badCategory };
  const { data, error } = await supabase.from('transactions').update({ category_id: categoryId }).eq('id', id).select('id, merchant');
  if (error) return dbFail(error);
  if (!data || data.length === 0) return { ok: false, error: NOT_FOUND };

  let also = 0;
  const key = normalizeMerchant(data[0].merchant as string | null);
  if (key) {
    const { data: pending, error: pError } = await supabase.from('transactions').select('id, merchant')
      .is('category_id', null).is('transfer_account_id', null).lt('amount', 0).not('merchant', 'is', null);
    if (pError) return dbFail(pError);
    const same = (pending ?? []).filter((t) => normalizeMerchant(t.merchant as string) === key).map((t) => String(t.id));
    if (same.length) {
      const { data: updated, error: uError } = await supabase.from('transactions').update({ category_id: categoryId }).in('id', same).select('id');
      if (uError) return dbFail(uError);
      also = updated?.length ?? 0;
    }
  }
  await runAlertsSafely(user.id);
  revalidatePath('/', 'layout');
  return { ok: true, also };
}
