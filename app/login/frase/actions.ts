'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSessionId } from '@/lib/auth/session';
import { markSessionVerified } from '@/lib/auth/verified-sessions';
import { checkPassphrase, hasExactWordCount, isValidHashFormat, normalisePassphrase } from '@/lib/auth/passphrase';
import {
  authCookieOptions, FAILURES_COOKIE, MAX_FAILURES, readFailures, SECOND_FACTOR_COOKIE, SECOND_FACTOR_TTL_SECONDS,
  signFailures, signSecondFactor,
} from '@/lib/auth/second-factor';

type Result = { ok: false; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyPassphrase(phrase: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hash = process.env.LOGIN_PASSPHRASE_HASH;
  const secret = process.env.LOGIN_2FA_SECRET;
  if (!hash || !secret || !isValidHashFormat(hash)) {
    console.error('Falta LOGIN_PASSPHRASE_HASH (formato scrypt.<sal>.<hash>, sin dolar) o LOGIN_2FA_SECRET');
    return { ok: false, error: 'Falta configurar la frase de acceso' };
  }

  const jar = await cookies();
  const normalised = normalisePassphrase(typeof phrase === 'string' ? phrase.slice(0, 500) : '');
  if (!hasExactWordCount(normalised)) {
    await sleep(1000);
    return { ok: false, error: 'La frase debe tener exactamente 10 palabras' };
  }

  if (checkPassphrase(normalised, hash)) {
    const sessionId = await getSessionId(supabase);
    if (!sessionId || !(await markSessionVerified(sessionId, user.id))) {
      return { ok: false, error: 'No se pudo completar el acceso. Inténtalo de nuevo.' };
    }
    jar.set(SECOND_FACTOR_COOKIE, signSecondFactor(user.id, sessionId, secret, Math.floor(Date.now() / 1000)),
      authCookieOptions(SECOND_FACTOR_TTL_SECONDS));
    jar.delete(FAILURES_COOKIE);
    redirect('/');
  }

  const failures = readFailures(jar.get(FAILURES_COOKIE)?.value, user.id, secret) + 1;
  if (failures >= MAX_FAILURES) {
    jar.delete(FAILURES_COOKIE);
    jar.delete(SECOND_FACTOR_COOKIE);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error cerrando sesión tras fallos de frase', error);
    redirect('/login');
  }
  jar.set(FAILURES_COOKIE, signFailures(user.id, failures, secret), authCookieOptions(60 * 60));
  await sleep(1000);
  return { ok: false, error: 'Frase incorrecta' };
}
