import { createAdminClient } from '@/lib/supabase/admin';
import { bearerToken, hashToken, matchAccount, parseApplePay } from '@/lib/apple-pay/parse';
import { learnedCategories, learnedCategory } from '@/lib/transactions/learn';
import { sendPushToUser } from '@/lib/push/send';
import { todayIn } from '@/lib/dates';
import { eur } from '@/lib/format';

/** Lo llama el atajo de iOS al pagar con Wallet: apunta el gasto con la cuenta de la tarjeta y la categoría aprendida. */
export async function POST(req: Request) {
  const token = bearerToken(req.headers.get('authorization'));
  if (!token) return Response.json({ error: 'Falta el token' }, { status: 401 });
  const db = createAdminClient();
  const { data: settings, error: sErr } = await db.from('settings').select('user_id, timezone')
    .eq('shortcut_token_hash', hashToken(token)).maybeSingle();
  if (sErr) return Response.json({ error: 'Error interno' }, { status: 500 });
  if (!settings) return Response.json({ error: 'Token no válido' }, { status: 401 });
  const userId = settings.user_id as string;

  // El atajo puede mandar el cuerpo como JSON o como Formulario.
  const body = (req.headers.get('content-type') ?? '').includes('form')
    ? await req.formData().then((f) => Object.fromEntries(f)).catch(() => null)
    : await req.json().catch(() => null);
  const payment = parseApplePay(body);
  if (typeof payment === 'string') return Response.json({ error: payment }, { status: 400 });

  // Admin ignora RLS: todas las consultas van filtradas por user_id.
  const [accRes, catRes, learnRes] = await Promise.all([
    db.from('accounts').select('id, name').eq('user_id', userId),
    db.from('categories').select('id, name, default_account_id').eq('user_id', userId),
    db.from('transactions').select('merchant, category_id, date, created_at').eq('user_id', userId)
      .not('category_id', 'is', null).not('merchant', 'is', null).order('date', { ascending: false }).limit(3000),
  ]);
  const failed = accRes.error ?? catRes.error ?? learnRes.error;
  if (failed) return Response.json({ error: 'Error interno' }, { status: 500 });

  const learned = learnedCategories((learnRes.data ?? []).map((r) => ({
    merchant: r.merchant as string, categoryId: r.category_id as string, date: String(r.date), createdAt: String(r.created_at),
  })));
  const categoryId = learnedCategory(learned, payment.merchant);
  const category = (catRes.data ?? []).find((c) => c.id === categoryId);
  const accountId = matchAccount(accRes.data ?? [], payment.card) ?? (category?.default_account_id as string | null) ?? null;

  const { error } = await db.from('transactions').insert({
    user_id: userId, date: todayIn((settings.timezone as string) || 'Europe/Madrid'), amount: -payment.amount,
    merchant: payment.merchant, category_id: categoryId, account_id: accountId, source: 'apple_pay',
  });
  if (error) {
    console.error('apple-pay: no se pudo apuntar', error);
    return Response.json({ error: 'No se pudo apuntar' }, { status: 500 });
  }

  const what = `${eur(payment.amount)}${payment.merchant ? ` en ${payment.merchant}` : ''}`;
  await sendPushToUser(db, userId, {
    title: category ? `Apuntado: ${what}` : `Apuntado sin categoría: ${what}`,
    body: category ? `${category.name as string}. Toca para cambiarlo.` : 'Toca para elegir la categoría.',
    url: category ? '/movimientos' : '/',
  }).catch((e) => console.error('apple-pay: push', e));

  return Response.json({ ok: true, message: `Apuntado ${what}${category ? ` · ${category.name as string}` : ''}` });
}
