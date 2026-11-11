'use server';

import { requireUser } from '@/lib/supabase/user';
import { EMPTY_PROFILE, parseProfile, type Profile } from '@/lib/profile';
import type { ActionResult } from '@/lib/types';

export async function getProfile(): Promise<Profile> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('settings').select('profile').eq('user_id', user.id).maybeSingle();
  if (error) console.error('Error leyendo el perfil', error);
  const p = parseProfile(data?.profile ?? null);
  return typeof p === 'string' ? EMPTY_PROFILE : p;
}

export async function saveProfile(raw: unknown): Promise<ActionResult> {
  const profile = parseProfile(raw);
  if (typeof profile === 'string') return { ok: false, error: profile };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('settings').update({ profile }).eq('user_id', user.id);
  if (error) {
    console.error('Error guardando el perfil', error);
    return { ok: false, error: 'No se pudo guardar el perfil' };
  }
  return { ok: true };
}
