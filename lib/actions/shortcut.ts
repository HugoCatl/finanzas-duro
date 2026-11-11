'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import { hashToken } from '@/lib/apple-pay/parse';

type TokenResult = { ok: true; token: string } | { ok: false; error: string };

/** Crea (o cambia) el token del atajo de Apple Pay. Solo se ve esta vez; el anterior deja de valer. */
export async function createShortcutToken(): Promise<TokenResult> {
  const { supabase, user } = await requireUser();
  const token = `fin_${randomBytes(24).toString('base64url')}`;
  const { data, error } = await supabase.from('settings').update({ shortcut_token_hash: hashToken(token) })
    .eq('user_id', user.id).select('user_id');
  if (error || !data?.length) {
    console.error('Error creando token del atajo', error);
    return { ok: false, error: 'No se pudo crear el token' };
  }
  revalidatePath('/ajustes');
  return { ok: true, token };
}

export async function revokeShortcutToken(): Promise<{ ok: boolean }> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('settings').update({ shortcut_token_hash: null }).eq('user_id', user.id);
  revalidatePath('/ajustes');
  return { ok: !error };
}

export async function hasShortcutToken(): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('settings').select('shortcut_token_hash').eq('user_id', user.id).maybeSingle();
  return Boolean(data?.shortcut_token_hash);
}
