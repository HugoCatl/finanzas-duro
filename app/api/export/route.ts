import { cookies } from 'next/headers';
import { SECOND_FACTOR_COOKIE } from '@/lib/auth/second-factor';
import { hasValidSecondFactor } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { loadExportData } from '@/lib/data/export';
import { transactionsToCsv } from '@/lib/export';

const noStore = { 'cache-control': 'no-store' };

export async function GET(req: Request) {
  // Las rutas /api no pasan por la redirección del proxy: autentica aquí y responde 401.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('No autorizado', { status: 401, headers: noStore });
  const jar = await cookies();
  if (!(await hasValidSecondFactor(supabase, user.id, jar.get(SECOND_FACTOR_COOKIE)?.value))) {
    return new Response('No autorizado', { status: 401, headers: noStore });
  }

  let data;
  try {
    data = await loadExportData(supabase, user.id);
  } catch (e) {
    console.error('Error exportando datos', e);
    return new Response('No se pudo exportar', { status: 500, headers: noStore });
  }
  const format = new URL(req.url).searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const stamp = data.today;

  if (format === 'csv') {
    return new Response('﻿' +transactionsToCsv(data.transactions, data.categories, data.accounts), {
      headers: {
        ...noStore,
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="movimientos-${stamp}.csv"`,
      },
    });
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...noStore,
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="finanzas-${stamp}.json"`,
    },
  });
}
