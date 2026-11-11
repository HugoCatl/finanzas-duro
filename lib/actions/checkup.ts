'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { loadUserData } from '@/lib/data/load';
import { monthOf } from '@/lib/dates';
import { isOnCooldown } from '@/lib/ai/summary';
import { createCheckup } from '@/lib/checkup/run';
import type { ActionResult } from '@/lib/types';

const COOLDOWN_MS = 10 * 60_000;

/** Chequeo de Duro del mes en curso, hasta hoy. Sustituye al que hubiera de este mes. */
export async function requestCheckup(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { data: last, error } = await supabase.from('ai_summaries').select('created_at').order('created_at', { ascending: false }).limit(1);
  if (error) {
    console.error('Error comprobando el último chequeo', error);
    return { ok: false, error: 'No se pudo hacer el chequeo. Inténtalo más tarde.' };
  }
  if (isOnCooldown(last?.[0]?.created_at ?? null, Date.now(), COOLDOWN_MS)) return { ok: false, error: 'Acabo de hacerte uno. Dame unos minutos.' };

  try {
    const data = await loadUserData(supabase, user.id);
    const checkup = await createCheckup(supabase, data, monthOf(data.today));
    if (!checkup) return { ok: false, error: 'Aún no hay movimientos para hacer un chequeo.' };
  } catch (e) {
    console.error('Error haciendo el chequeo', e);
    return { ok: false, error: 'No se pudo hacer el chequeo. Inténtalo más tarde.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
