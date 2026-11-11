'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { ownedError } from '@/lib/supabase/owned';
import { runAlertsForUser } from '@/lib/alerts/run';
import { validateCategory, validateLimit, validateRecurring } from '@/lib/budget/validate';
import type { ActionResult, CategoryKind } from '@/lib/types';

export interface CategoryInput {
  id?: string;
  name: string;
  icon: string;
  kind: CategoryKind;
  isFixed: boolean;
  monthlyLimit: number | null;
  defaultAccountId?: string | null; // cuenta propuesta al apuntar un movimiento de esta categoría
}

export interface RecurringInput {
  id?: string;
  name: string;
  amount: number; // positivo; el signo lo pone `kind`
  kind: 'expense' | 'income' | 'transfer' | 'plan';
  categoryId: string | null;
  accountId: string | null; // en un traspaso, la de origen; en un plan se toma la de la posición
  transferAccountId?: string | null;
  holdingId?: string | null;
  dayOfMonth: number;
  active: boolean;
}

const CATEGORY_NOT_FOUND = 'No se encontró la categoría';
const RECURRING_NOT_FOUND = 'No se encontró el fijo';

const SAVE_FAILED = 'No se pudo guardar';

const done = (error: { message: string } | null): ActionResult => {
  if (error) {
    console.error('Error de base de datos', error);
    return { ok: false, error: SAVE_FAILED };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
};

/** Resultado de una escritura con `.select('id')`: error o cero filas = fallo. */
const doneRows = (res: { data: { id: string }[] | null; error: { message: string } | null }, notFound: string): ActionResult => {
  if (res.error) {
    console.error('Error de base de datos', res.error);
    return { ok: false, error: SAVE_FAILED };
  }
  if (!res.data || res.data.length === 0) return { ok: false, error: notFound };
  revalidatePath('/', 'layout');
  return { ok: true };
};

export async function setCategoryLimit(categoryId: string, limit: number | null): Promise<ActionResult> {
  const invalid = validateLimit(limit);
  if (invalid) return { ok: false, error: invalid };
  const { supabase, user } = await requireUser();
  const res = await supabase.from('categories').update({ monthly_limit: limit }).eq('id', categoryId).select('id');
  const result = doneRows(res, CATEGORY_NOT_FOUND);
  if (result.ok) {
    try {
      await runAlertsForUser(createAdminClient(), user.id);
    } catch (e) {
      console.error('Error evaluando avisos', e);
    }
  }
  return result;
}

export async function upsertCategory(input: CategoryInput): Promise<ActionResult> {
  const invalid = validateCategory(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase } = await requireUser();
  const badAccount = await ownedError(supabase, 'accounts', input.defaultAccountId, 'Cuenta no válida');
  if (badAccount) return { ok: false, error: badAccount };
  const row = {
    name: input.name.trim(),
    icon: input.icon,
    kind: input.kind,
    is_fixed: input.isFixed,
    monthly_limit: input.kind === 'expense' ? input.monthlyLimit : null,
    default_account_id: input.defaultAccountId ?? null,
  };
  if (input.id) {
    return doneRows(await supabase.from('categories').update(row).eq('id', input.id).select('id'), CATEGORY_NOT_FOUND);
  }
  return done((await supabase.from('categories').insert({ ...row, sort_order: 100 })).error);
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  return doneRows(await supabase.from('categories').delete().eq('id', id).select('id'), CATEGORY_NOT_FOUND);
}

export async function upsertRecurring(input: RecurringInput): Promise<ActionResult> {
  const invalid = validateRecurring(input);
  if (invalid) return { ok: false, error: invalid };
  const { supabase } = await requireUser();
  const money = input.kind === 'expense' || input.kind === 'income';
  let accountId = input.kind === 'plan' ? null : input.accountId;
  if (input.kind === 'plan') {
    const { data: holding, error } = await supabase.from('holdings').select('account_id').eq('id', input.holdingId!).maybeSingle();
    if (error) return done(error);
    if (!holding) return { ok: false, error: 'Posición no válida' };
    accountId = String(holding.account_id);
  }
  const badRef =
    (money ? await ownedError(supabase, 'categories', input.categoryId, 'Categoría no válida', input.kind as CategoryKind) : null) ??
    (await ownedError(supabase, 'accounts', accountId, 'Cuenta no válida')) ??
    (input.kind === 'transfer' ? await ownedError(supabase, 'accounts', input.transferAccountId, 'Cuenta no válida') : null);
  if (badRef) return { ok: false, error: badRef };
  const row = {
    name: input.name.trim(),
    amount: input.kind === 'income' ? input.amount : -input.amount,
    category_id: money ? input.categoryId : null,
    account_id: accountId,
    transfer_account_id: input.kind === 'transfer' ? input.transferAccountId : null,
    holding_id: input.kind === 'plan' ? input.holdingId : null,
    day_of_month: input.dayOfMonth,
    active: input.active,
  };
  if (input.id) {
    return doneRows(await supabase.from('recurring').update(row).eq('id', input.id).select('id'), RECURRING_NOT_FOUND);
  }
  return done((await supabase.from('recurring').insert(row)).error);
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  return doneRows(await supabase.from('recurring').delete().eq('id', id).select('id'), RECURRING_NOT_FOUND);
}
