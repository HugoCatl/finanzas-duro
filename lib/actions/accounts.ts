'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/user';
import { todayIn } from '@/lib/dates';
import { validateAccount, type AccountInput } from '@/lib/accounts/validate';
import type { ActionResult } from '@/lib/types';

const NOT_FOUND = 'No se encontró la cuenta';
const MAX_EUR = 10_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(e: { message: string }): ActionResult {
  console.error('Error en cuentas', e);
  return { ok: false, error: 'No se pudo guardar. Vuelve a intentarlo.' };
}

/** Crea una cuenta y, si se indica saldo, su posición de efectivo con ese saldo. */
export async function createAccount(input: AccountInput & { cash: number | null }): Promise<ActionResult> {
  if (input?.cash !== null && !(typeof input?.cash === 'number' && Number.isFinite(input.cash) && input.cash >= 0 && input.cash <= MAX_EUR)) {
    return { ok: false, error: 'Saldo no válido' };
  }
  const { supabase } = await requireUser();
  const { data: accounts, error: listError } = await supabase.from('accounts').select('name, sort_order');
  if (listError) return fail(listError);
  const invalid = validateAccount(input, (accounts ?? []).map((a) => String(a.name)));
  if (invalid) return { ok: false, error: invalid };

  const name = input.name.trim();
  const order = Math.max(-1, ...(accounts ?? []).map((a) => Number(a.sort_order))) + 1;
  const { data: account, error } = await supabase.from('accounts')
    .insert({ name, institution: name, color: input.color, sort_order: order }).select('id').single();
  if (error) return fail(error);

  if (input.cash !== null) {
    const { data: holding, error: hError } = await supabase.from('holdings').insert({ account_id: account.id, name: `Efectivo ${name}`, kind: 'cash' }).select('id').single();
    if (hError) return fail(hError);
    const { error: eError } = await supabase.from('holding_events')
      .insert({ holding_id: holding.id, type: 'balance_adjust', date: todayIn(), amount_eur: Math.round(input.cash * 100) / 100 });
    if (eError) return fail(eError);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Cambia el nombre y el color de una cuenta. */
export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const { supabase } = await requireUser();
  const { data: accounts, error: listError } = await supabase.from('accounts').select('id, name');
  if (listError) return fail(listError);
  if (!(accounts ?? []).some((a) => a.id === id)) return { ok: false, error: NOT_FOUND };
  const invalid = validateAccount(input, (accounts ?? []).filter((a) => a.id !== id).map((a) => String(a.name)));
  if (invalid) return { ok: false, error: invalid };

  const name = input.name.trim();
  const { data, error } = await supabase.from('accounts').update({ name, institution: name, color: input.color }).eq('id', id).select('id');
  if (error) return fail(error);
  if (!data?.length) return { ok: false, error: NOT_FOUND };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Borra una cuenta con sus posiciones. Antes quita los traspasos y fijos de traspaso en los que participa:
 * un traspaso sin cuenta de origen no tiene sentido (y la base de datos no lo admite). Los gastos e
 * ingresos de la cuenta se conservan, sin cuenta, para no descuadrar el historial de gasto.
 */
export async function deleteAccount(id: string): Promise<ActionResult> {
  // El id va dentro de un filtro .or(): solo se acepta un UUID.
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, error: NOT_FOUND };
  const { supabase } = await requireUser();
  const { data: account, error: findError } = await supabase.from('accounts').select('id').eq('id', id).maybeSingle();
  if (findError) return fail(findError);
  if (!account) return { ok: false, error: NOT_FOUND };

  const transfers = `transfer_account_id.eq.${id},and(account_id.eq.${id},transfer_account_id.not.is.null)`;
  const [tx, rec] = await Promise.all([
    supabase.from('transactions').delete().or(transfers),
    supabase.from('recurring').delete().or(transfers),
  ]);
  if (tx.error ?? rec.error) return fail((tx.error ?? rec.error)!);
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) return fail(error);
  revalidatePath('/', 'layout');
  redirect('/cuentas');
}
