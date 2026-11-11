import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SECOND_FACTOR_COOKIE } from '@/lib/auth/second-factor';
import { hasValidSecondFactor } from '@/lib/auth/session';
import { createClient } from './server';

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const jar = await cookies();
  if (!(await hasValidSecondFactor(supabase, user.id, jar.get(SECOND_FACTOR_COOKIE)?.value))) {
    redirect('/login/frase');
  }
  return { supabase, user };
}
