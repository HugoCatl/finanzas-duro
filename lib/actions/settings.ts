'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FAILURES_COOKIE, SECOND_FACTOR_COOKIE } from '@/lib/auth/second-factor';
import { getSessionId } from '@/lib/auth/session';
import { revokeSession } from '@/lib/auth/verified-sessions';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/user';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePushEndpoint, validatePushSubscription, validateThreshold } from '@/lib/settings/validate';
import type { ActionResult } from '@/lib/types';

export async function updateSettings(input: { bigExpenseThreshold: number }): Promise<ActionResult> {
  const invalid = validateThreshold(input?.bigExpenseThreshold);
  if (invalid) return { ok: false, error: invalid };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('settings')
    .update({ big_expense_threshold: input.bigExpenseThreshold })
    .eq('user_id', user.id)
    .select('user_id');
  if (error) {
    console.error('Error guardando ajustes', error);
    return { ok: false, error: 'No se pudo guardar' };
  }
  if (!data || data.length === 0) return { ok: false, error: 'No se encontraron tus ajustes' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Objetivo de patrimonio total; null lo quita. */
export async function updateNetWorthTarget(target: number | null): Promise<ActionResult> {
  if (target !== null && validateThreshold(target)) return { ok: false, error: 'Importe no válido' };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('settings').update({ net_worth_target: target }).eq('user_id', user.id).select('user_id');
  if (error) {
    console.error('Error guardando el objetivo', error);
    return { ok: false, error: 'No se pudo guardar' };
  }
  if (!data || data.length === 0) return { ok: false, error: 'No se encontraron tus ajustes' };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function savePushSubscription(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceLabel: string,
): Promise<ActionResult> {
  const invalid = validatePushSubscription(sub);
  if (invalid) return { ok: false, error: invalid };
  const { user } = await requireUser();
  // `endpoint` es único globalmente. Si este dispositivo estaba suscrito con otro usuario (p. ej. cambio de
  // cuenta), el cliente RLS no puede reasignarlo y fallaría; con el cliente admin lo movemos al usuario
  // autenticado (user_id siempre sale de la sesión, nunca del cliente).
  const { error } = await createAdminClient().from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      device_label: String(deviceLabel ?? '').slice(0, 60),
    },
    { onConflict: 'endpoint' },
  );
  if (error) {
    console.error('Error guardando suscripción push', error);
    return { ok: false, error: 'No se pudo activar en este dispositivo' };
  }
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const invalid = validatePushEndpoint(endpoint);
  if (invalid) return { ok: false, error: invalid };
  const { supabase, user } = await requireUser();
  // Cliente RLS: solo puede borrar suscripciones del propio usuario.
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  if (error) {
    console.error('Error eliminando suscripción push', error);
    return { ok: false, error: 'No se pudo desactivar en este dispositivo' };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  // Sin requireUser: quien aún no ha pasado la frase de acceso también debe poder cerrar sesión.
  const supabase = await createClient();
  try {
    const sessionId = await getSessionId(supabase);
    if (sessionId) await revokeSession(sessionId); // best-effort: la fila caduca sola a los 30 días
  } catch (e) {
    console.error('Error revocando la sesión verificada', e);
  }
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error cerrando sesión', error); // signOut limpia las cookies locales igualmente
  const jar = await cookies();
  jar.delete(SECOND_FACTOR_COOKIE);
  jar.delete(FAILURES_COOKIE);
  redirect('/login');
}

const RESET_CONFIRMATION = 'BORRAR';
// Del más dependiente al menos: las compras antes que sus posiciones y estas antes que las cuentas.
const RESET_TABLES = ['holding_events', 'transactions', 'recurring', 'holdings', 'accounts', 'snapshots', 'alerts', 'ai_summaries'] as const;

/**
 * Borra todos los datos financieros del usuario para empezar de cero con el asistente de bienvenida.
 * Se conservan la cuenta de acceso, las categorías (sin límites ni cuenta habitual) y los avisos push.
 */
export async function resetAllData(confirmation: string): Promise<ActionResult> {
  if (confirmation !== RESET_CONFIRMATION) return { ok: false, error: `Escribe ${RESET_CONFIRMATION} para confirmar` };
  const { supabase, user } = await requireUser();
  for (const table of RESET_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id);
    if (error) {
      console.error(`Error borrando ${table}`, error);
      return { ok: false, error: 'No se pudo borrar todo. Vuelve a intentarlo.' };
    }
  }
  const [cats, settings] = await Promise.all([
    supabase.from('categories').update({ monthly_limit: null, default_account_id: null }).eq('user_id', user.id),
    supabase.from('settings').update({ net_worth_target: null }).eq('user_id', user.id),
  ]);
  if (cats.error ?? settings.error) {
    console.error('Error reiniciando categorías o ajustes', cats.error ?? settings.error);
    return { ok: false, error: 'No se pudo borrar todo. Vuelve a intentarlo.' };
  }
  revalidatePath('/', 'layout');
  redirect('/bienvenida');
}
