import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_TEST_URL;
const anon = process.env.SUPABASE_TEST_ANON_KEY;
const service = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

describe.skipIf(!url || !anon || !service)('RLS y datos iniciales', () => {
  // Se crea en beforeAll (no en el cuerpo del describe) para que skipIf funcione sin variables.
  let admin: SupabaseClient;
  const users: { id: string; client: SupabaseClient }[] = [];

  // Marca la sesión del cliente como verificada (lo que hace verifyPassphrase con el admin client).
  async function verifySession(u: { id: string; client: SupabaseClient }) {
    const { data } = await u.client.auth.getClaims();
    const sessionId = data?.claims.session_id;
    if (!sessionId) throw new Error('El token no trae session_id');
    const expires_at = new Date(Date.now() + 3600_000).toISOString();
    const { error } = await admin.from('verified_sessions').upsert({ session_id: sessionId, user_id: u.id, expires_at });
    if (error) throw error;
  }

  async function makeUser() {
    const email = `test-${randomUUID()}@example.com`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const client = createClient(url!, anon!, { auth: { persistSession: false } });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    users.push({ id: data.user.id, client });
    return users[users.length - 1];
  }

  beforeAll(async () => {
    admin = createClient(url!, service!, { auth: { persistSession: false } });
    await verifySession(await makeUser());
    await verifySession(await makeUser());
  });

  afterAll(async () => {
    for (const u of users) await admin.auth.admin.deleteUser(u.id);
  });

  it('crea las 4 cuentas y las categorías por defecto', async () => {
    const { data: accounts } = await users[0].client.from('accounts').select('name');
    expect(accounts?.map((a) => a.name).sort()).toEqual(['ING', 'MyInvestor', 'Trade Republic', 'Trust Wallet']);
    const { count } = await users[0].client.from('categories').select('*', { count: 'exact', head: true });
    expect(count).toBe(11);
  });

  it('un usuario no ve los movimientos de otro', async () => {
    const [a, b] = users;
    const { error } = await a.client.from('transactions').insert({ date: '2026-10-01', amount: -12.5 });
    expect(error).toBeNull();
    const { data: own } = await a.client.from('transactions').select('id');
    expect(own).toHaveLength(1);
    const { data: other } = await b.client.from('transactions').select('id');
    expect(other).toHaveLength(0);
  });

  it('no se puede insertar con user_id ajeno', async () => {
    const [a, b] = users;
    const { error } = await b.client.from('transactions').insert({ user_id: a.id, date: '2026-10-01', amount: -1 });
    expect(error).not.toBeNull();
  });

  it('una sesión sin verificar (solo contraseña) no lee ni escribe nada', async () => {
    const unverified = await makeUser(); // sin fila en verified_sessions
    const { data: accounts } = await unverified.client.from('accounts').select('id');
    expect(accounts).toHaveLength(0);
    const { error } = await unverified.client.from('transactions').insert({ date: '2026-10-01', amount: -1 });
    expect(error).not.toBeNull();
  });

  it('una sesión con la verificación caducada deja de ver datos', async () => {
    const u = await makeUser();
    await verifySession(u);
    const { data: claims } = await u.client.auth.getClaims();
    await admin.from('verified_sessions').update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('session_id', claims!.claims.session_id);
    const { data } = await u.client.from('accounts').select('id');
    expect(data).toHaveLength(0);
  });

  it('verified_sessions no es accesible con el cliente del usuario', async () => {
    const { data } = await users[0].client.from('verified_sessions').select('session_id');
    expect(data ?? []).toHaveLength(0);
  });
});
