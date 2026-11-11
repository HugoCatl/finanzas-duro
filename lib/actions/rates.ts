'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import type { ActionResult } from '@/lib/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Pone la TAE de la cuenta desde `fromDate` (0 = deja de pagar). Si ya había una ese día, la cambia. */
export async function setAccountRate(accountId: string, rate: number, fromDate: string): Promise<ActionResult> {
  if (typeof accountId !== 'string' || !UUID.test(accountId)) return { ok: false, error: 'Cuenta no válida' };
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate >= 0.25) return { ok: false, error: 'TAE no válida (entre 0 y 25 %)' };
  if (typeof fromDate !== 'string' || !DATE.test(fromDate) || Number.isNaN(Date.parse(fromDate))) return { ok: false, error: 'Fecha no válida' };
  const { supabase } = await requireUser();
  const { error } = await supabase.from('account_rates')
    .upsert({ account_id: accountId, rate: Math.round(rate * 100_000) / 100_000, from_date: fromDate }, { onConflict: 'account_id,from_date' });
  if (error) {
    console.error('Error guardando la TAE', error);
    return { ok: false, error: 'No se pudo guardar. Vuelve a intentarlo.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Quita un cambio de TAE (por si se apuntó mal). Los intereses ya cobrados se quedan. */
export async function deleteAccountRate(id: string): Promise<ActionResult> {
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, error: 'No válido' };
  const { supabase } = await requireUser();
  const { error } = await supabase.from('account_rates').delete().eq('id', id);
  if (error) {
    console.error('Error borrando la TAE', error);
    return { ok: false, error: 'No se pudo borrar. Vuelve a intentarlo.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
