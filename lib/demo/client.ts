import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_USER_ID, seedDemo, type Tables } from './seed';

/**
 * Imitación mínima del cliente de Supabase sobre tablas en memoria: lo que usa la app (filtros, orden,
 * rangos, insert, update, upsert, delete). Los datos viven mientras dure el servidor de desarrollo.
 */
type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const g = globalThis as unknown as { __demoDb?: Tables };
const db = (): Tables => (g.__demoDb ??= seedDemo(new Date()));

const PK: Record<string, string[]> = { settings: ['user_id'], holding_profiles: ['holding_id'], price_cache: ['coingecko_id'] };

const cmp = (a: unknown, b: unknown) => {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== 'string') return na - nb;
  return String(a) < String(b) ? -1 : 1;
};
const same = (a: unknown, b: unknown) => (a === null || a === undefined ? b === null || b === undefined : String(a) === String(b));
let seq = 0;
const uuid = () => crypto.randomUUID();

class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null; count?: number | null }> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private from = 0;
  private to = Infinity;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private payload: Row[] | Row = [];
  private conflict: string[] | null = null;
  private head = false;
  private returning = false;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== 'select') this.returning = true;
    if (opts?.head) this.head = true;
    return this;
  }
  eq(c: string, v: unknown) { this.filters.push((r) => same(r[c], v)); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => !same(r[c], v)); return this; }
  gt(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) > 0); return this; }
  gte(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) >= 0); return this; }
  lt(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) < 0); return this; }
  lte(c: string, v: unknown) { this.filters.push((r) => cmp(r[c], v) <= 0); return this; }
  in(c: string, vs: unknown[]) { this.filters.push((r) => vs.some((v) => same(r[c], v))); return this; }
  is(c: string, v: unknown) { this.filters.push((r) => same(r[c], v)); return this; }
  match(o: Row) { for (const [c, v] of Object.entries(o)) this.eq(c, v); return this; }
  not(c: string, op: string, v: unknown) {
    if (op === 'is') this.filters.push((r) => !same(r[c], v));
    else if (op === 'in') { const vs = String(v).replace(/[()]/g, '').split(','); this.filters.push((r) => !vs.some((x) => same(r[c], x))); }
    else this.filters.push((r) => !same(r[c], v));
    return this;
  }
  /** "col.eq.val,col2.eq.val2": basta con que se cumpla una. */
  or(expr: string) {
    const parts = expr.split(',').map((p) => p.split('.'));
    this.filters.push((r) => parts.some(([c, , v]) => same(r[c], v)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending ?? true }); return this; }
  range(f: number, t: number) { this.from = f; this.to = t; return this; }
  limit(n: number) { this.to = this.from + n - 1; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  insert(rows: Row[] | Row) { this.op = 'insert'; this.payload = rows; return this; }
  update(vals: Row) { this.op = 'update'; this.payload = vals; return this; }
  upsert(rows: Row[] | Row, opts?: { onConflict?: string }) {
    this.op = 'upsert'; this.payload = rows; this.conflict = opts?.onConflict?.split(',').map((s) => s.trim()) ?? null; return this;
  }
  delete() { this.op = 'delete'; return this; }

  private run() {
    const tables = db();
    const rows = (tables[this.table] ??= []);
    const match = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[];
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r): Row => ({
        id: uuid(), user_id: DEMO_USER_ID, created_at: new Date(Date.now() + seq++).toISOString(), ...r,
      }));
      out = [];
      for (const r of list) {
        const key = this.op === 'upsert' ? this.conflict ?? PK[this.table] ?? ['id'] : null;
        const existing = key ? rows.find((x) => key.every((k) => same(x[k], r[k]))) : undefined;
        if (existing) { Object.assign(existing, r, { id: existing.id }); out.push(existing); } else { rows.push(r); out.push(r); }
      }
    } else if (this.op === 'update') {
      out = rows.filter(match);
      for (const r of out) Object.assign(r, this.payload);
    } else if (this.op === 'delete') {
      out = rows.filter(match);
      tables[this.table] = rows.filter((r) => !match(r));
    } else {
      out = rows.filter(match);
      if (this.table === 'price_cache') out = out.map((r) => ({ ...r, updated_at: new Date().toISOString() })); // siempre al día
      for (const { col, asc } of [...this.orders].reverse()) out = [...out].sort((a, b) => (asc ? 1 : -1) * cmp(a[col], b[col]));
      out = out.slice(this.from, this.to === Infinity ? undefined : this.to + 1);
    }
    if (this.op !== 'select' && !this.returning) return { data: null, error: null, count: null };
    if (this.head) return { data: null, error: null, count: out.length };
    if (this.mode === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'No rows', code: 'PGRST116' } };
    if (this.mode === 'maybe') return { data: out[0] ?? null, error: null };
    return { data: out, error: null, count: out.length };
  }

  then<A = never, B = never>(
    ok?: ((v: { data: unknown; error: { message: string; code?: string } | null; count?: number | null }) => A | PromiseLike<A>) | null,
    ko?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(ok, ko);
  }
}

const user = { id: DEMO_USER_ID, email: 'demo@finanzas.local', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2023-11-01T00:00:00Z' };

export function demoClient(): SupabaseClient {
  return {
    from: (table: string) => new Query(table),
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getClaims: async () => ({ data: { claims: { sub: user.id, session_id: 'demo' } }, error: null }),
      getSession: async () => ({ data: { session: { user } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as SupabaseClient;
}
