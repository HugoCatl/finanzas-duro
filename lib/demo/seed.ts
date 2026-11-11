/**
 * Datos inventados para el modo demo: tres años de nómina, gastos, traspasos, planes de inversión y foto
 * del patrimonio. Todo sale de una simulación mes a mes con números aleatorios fijos (siempre igual).
 */
type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export const DEMO_USER_ID = '00000000-0000-4000-8000-00000000d0d0';
const U = DEMO_USER_ID;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function seedDemo(now: Date): Tables {
  const rand = rng(20231101);
  const between = (a: number, b: number) => a + rand() * (b - a);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const today = now.toISOString().slice(0, 10);
  const [ty, tm, td] = today.split('-').map(Number);
  let idn = 0;
  const ids = (p: string) => `${p.padEnd(8, '0').slice(0, 8)}-0000-4000-8000-${String(++idn).padStart(12, '0')}`;

  // Cuentas.
  const ing = ids('a1'), tr = ids('a2'), mi = ids('a3'), bp = ids('a4');
  const accounts = [
    { id: ing, user_id: U, name: 'ING', institution: 'ING', color: '#ff6200', sort_order: 0 },
    { id: tr, user_id: U, name: 'Trade Republic', institution: 'Trade Republic', color: '#a1a1aa', sort_order: 1 },
    { id: mi, user_id: U, name: 'MyInvestor', institution: 'MyInvestor', color: '#0ea5e9', sort_order: 2 },
    { id: bp, user_id: U, name: 'Bitpanda', institution: 'Bitpanda', color: '#22c55e', sort_order: 3 },
  ];

  // Categorías (las mismas que crea la app al registrarse) con límites de presupuesto.
  const cat = (name: string, icon: string, kind: string, fixed: boolean, limit: number | null) => ({
    id: ids('c'), user_id: U, name, icon, kind, is_fixed: fixed, monthly_limit: limit, sort_order: 0, default_account_id: null as string | null,
  });
  const C = {
    casa: cat('Vivienda', 'home', 'expense', true, 700), super: cat('Supermercado', 'shopping-cart', 'expense', false, 260),
    fuera: cat('Comida fuera', 'utensils', 'expense', false, 140), transp: cat('Transporte', 'car', 'expense', false, 110),
    ocio: cat('Ocio', 'party-popper', 'expense', false, 120), subs: cat('Suscripciones', 'repeat', 'expense', true, 30),
    salud: cat('Salud', 'heart-pulse', 'expense', false, 60), ropa: cat('Ropa', 'shirt', 'expense', false, 80),
    otros: cat('Otros', 'circle', 'expense', false, 90), nomina: cat('Nómina', 'briefcase', 'income', true, null),
    otrosIn: cat('Otros ingresos', 'plus-circle', 'income', false, null),
  };
  const categories = Object.values(C).map((c, i) => ({ ...c, sort_order: i }));

  // Posiciones.
  const hold = (accountId: string, name: string, kind: string, extra: Row = {}) => ({
    id: ids('b'), user_id: U, account_id: accountId, name, kind, apy: null, coingecko_id: null, isin: null, price_symbol: null,
    archived: false, created_at: '2023-11-01T09:00:00Z', ...extra,
  });
  const H = {
    ingCash: hold(ing, 'Cuenta nómina', 'cash'),
    trCash: hold(tr, 'Efectivo', 'cash'),
    miCash: hold(mi, 'Efectivo', 'cash'),
    world: hold(mi, 'Fidelity MSCI World', 'fund', { isin: 'IE00BYX5NX33', price_symbol: 'DEMO-WORLD' }),
    em: hold(mi, 'Vanguard Emerging Markets', 'fund', { isin: 'IE0031786696', price_symbol: 'DEMO-EM' }),
    apple: hold(tr, 'Apple', 'stock', { isin: 'US0378331005', price_symbol: 'DEMO-AAPL' }),
    btc: hold(bp, 'Bitcoin', 'crypto', { coingecko_id: 'demo-bitcoin' }),
    eth: hold(bp, 'Ethereum', 'crypto', { coingecko_id: 'demo-ethereum' }),
  };
  const holdings = Object.values(H);

  // Precio de cada activo: crece hasta el de hoy con altibajos.
  const assets = {
    world: { now: 36.4, cagr: 0.13, vol: 0.035, key: 'yf:DEMO-WORLD', ch: 0.4 },
    em: { now: 31.2, cagr: 0.07, vol: 0.045, key: 'yf:DEMO-EM', ch: -0.3 },
    apple: { now: 228, cagr: 0.16, vol: 0.07, key: 'yf:DEMO-AAPL', ch: 1.2 },
    btc: { now: 86500, cagr: 0.42, vol: 0.13, key: 'demo-bitcoin', ch: -1.8 },
    eth: { now: 3150, cagr: 0.18, vol: 0.15, key: 'demo-ethereum', ch: -2.4 },
  };
  type Asset = keyof typeof assets;
  const start = { y: 2023, m: 11 };
  const months: { y: number; m: number }[] = [];
  for (let y = start.y, m = start.m; y < ty || (y === ty && m <= tm); m === 12 ? (y++, (m = 1)) : m++) months.push({ y, m });
  const N = months.length;
  const path: Record<Asset, number[]> = {} as Record<Asset, number[]>;
  for (const k of Object.keys(assets) as Asset[]) {
    const a = assets[k];
    const p: number[] = [];
    for (let i = 0; i < N; i++) {
      const yearsLeft = (N - 1 - i) / 12;
      p.push(a.now / Math.pow(1 + a.cagr, yearsLeft) * (i >= N - 2 ? 1 : 1 + (rand() - 0.5) * 2 * a.vol));
    }
    path[k] = p;
  }

  const transactions: Row[] = [];
  const events: Row[] = [];
  const snapshots: Row[] = [];
  let ct = 0;
  const created = (date: string) => `${date}T12:${pad(Math.floor(ct / 60) % 60)}:${pad(ct++ % 60)}Z`;
  const tx = (date: string, amount: number, merchant: string, catId: string | null, accountId: string, source = 'manual', extra: Row = {}) =>
    transactions.push({ id: ids('d'), user_id: U, date, amount: r2(amount), merchant, note: null, category_id: catId, account_id: accountId,
      source, recurring_id: null, transfer_account_id: null, created_at: created(date), ...extra });
  const ev = (holdingId: string, date: string, type: string, amount: number, qty: number | null, unit: number | null, extra: Row = {}) =>
    events.push({ id: ids('e'), user_id: U, holding_id: holdingId, date, type, amount_eur: r2(amount), quantity: qty, unit_price_eur: unit,
      recurring_id: null, created_at: created(date), ...extra });

  // Fijos.
  const rec = (name: string, amount: number, day: number, extra: Row) => ({
    id: ids('f'), user_id: U, name, amount, day_of_month: day, active: true, category_id: null, account_id: null,
    transfer_account_id: null, holding_id: null, ...extra,
  });
  const R = {
    nomina: rec('Nómina', 2180, 28, { category_id: C.nomina.id, account_id: ing }),
    alquiler: rec('Alquiler', -650, 1, { category_id: C.casa.id, account_id: ing }),
    internet: rec('Digi fibra y móvil', -30, 6, { category_id: C.casa.id, account_id: ing }),
    gym: rec('Gimnasio', -34.9, 3, { category_id: C.salud.id, account_id: ing }),
    spotify: rec('Spotify', -11.99, 12, { category_id: C.subs.id, account_id: ing }),
    netflix: rec('Netflix', -13.99, 18, { category_id: C.subs.id, account_id: ing }),
    toTr: rec('Ahorro a Trade Republic', -750, 2, { account_id: ing, transfer_account_id: tr }),
    toMi: rec('Para el plan indexado', -350, 2, { account_id: ing, transfer_account_id: mi }),
    planWorld: rec('Plan MSCI World', -300, 5, { holding_id: H.world.id }),
    planEm: rec('Plan Emergentes', -50, 5, { holding_id: H.em.id }),
  };
  const recurring = Object.values(R);

  // Saldos que la simulación va llevando.
  const bal = { ing: 2600, tr: 5000, mi: 0 };
  const qty: Record<Asset, number> = { world: 0, em: 0, apple: 0, btc: 0, eth: 0 };
  const buy = (k: Asset, holdingId: string, date: string, amount: number, i: number, recurringId: string | null = null) => {
    const unit = path[k][i] * (1 + (rand() - 0.5) * 0.01);
    const q = amount / unit;
    qty[k] += q;
    ev(holdingId, date, 'buy', amount, Number(q.toFixed(8)), r2(unit), { recurring_id: recurringId });
  };

  // Punto de partida: lo que ya tenía al empezar.
  const d0 = iso(start.y, start.m, 1);
  ev(H.ingCash.id, d0, 'deposit', bal.ing, null, null);
  ev(H.trCash.id, d0, 'deposit', bal.tr, null, null);
  ev(H.miCash.id, d0, 'deposit', 7700, null, null); // lo que pagó las compras iniciales de fondos
  buy('world', H.world.id, d0, 6500, 0);
  buy('em', H.em.id, d0, 1200, 0);
  buy('btc', H.btc.id, iso(2023, 11, 14), 1200, 0);
  buy('eth', H.eth.id, iso(2023, 11, 14), 700, 0);

  const shops = {
    super: ['Mercadona', 'Lidl', 'Carrefour', 'Mercadona', 'Dia'], fuera: ['Bar Manolo', 'Telepizza', 'Five Guys', 'Café Central', 'Sushi Go', 'La Tagliatella', 'Burger King'],
    transp: ['Repsol', 'Cepsa', 'Renfe', 'Cabify', 'Parking centro'], ocio: ['Cines Yelmo', 'Entradas concierto', 'Steam', 'Bolera', 'Escape room', 'Libros Casa del Libro'],
    ropa: ['Zara', 'Decathlon', 'Pull&Bear', 'Primark'], otros: ['Amazon', 'Farmacia', 'Peluquería', 'Regalo cumpleaños', 'Ferretería'],
  };
  const apr = 0.0225;

  for (let i = 0; i < N; i++) {
    const { y, m } = months[i];
    const isNow = y === ty && m === tm;
    const last = isNow ? td : daysIn(y, m);
    const day = (d: number) => iso(y, m, Math.min(d, last));
    const has = (d: number) => d <= last;

    // Fijos del mes.
    for (const r of [R.alquiler, R.internet, R.gym, R.spotify, R.netflix, R.nomina]) {
      if (!has(r.day_of_month)) continue;
      const amount = r === R.nomina ? (m === 6 || m === 12 ? 2180 * 2 : 2180) + (y >= 2025 ? 120 : 0) : r.amount;
      tx(day(r.day_of_month), amount, r.name, r.category_id, ing, 'recurring', { recurring_id: r.id });
      bal.ing += amount;
    }
    // Traspasos y planes.
    if (has(2)) {
      for (const r of [R.toTr, R.toMi]) {
        tx(day(2), r.amount, r.name, null, ing, 'recurring', { recurring_id: r.id, transfer_account_id: r.transfer_account_id });
        bal.ing += r.amount;
        if (r === R.toTr) bal.tr -= r.amount; else bal.mi -= r.amount;
      }
    }
    if (has(5) && i > 0) {
      buy('world', H.world.id, day(5), 300, i, R.planWorld.id);
      buy('em', H.em.id, day(5), 50, i, R.planEm.id);
      bal.mi -= 350;
    }
    if (i % 4 === 2 && has(20)) { buy('apple', H.apple.id, day(20), 500, i); bal.tr -= 500; }
    if (has(15) && i > 0) buy('btc', H.btc.id, day(15), 50, i);
    // Intereses de la cuenta remunerada, el día 1 por el mes anterior.
    if (i > 0) {
      const interest = r2((bal.tr * apr) / 12);
      tx(day(1), interest, 'Intereses Trade Republic', C.otrosIn.id, tr, 'interest');
      bal.tr += interest;
    }

    // Gastos del día a día.
    const add = (n: number, lo: number, hi: number, catId: string, list: string[]) => {
      for (let k = 0; k < n; k++) {
        const d = 1 + Math.floor(rand() * last);
        const amount = -between(lo, hi);
        tx(day(d), amount, pick(list), catId, ing, rand() < 0.5 ? 'apple_pay' : 'manual');
        bal.ing += amount;
      }
    };
    const scale = isNow ? last / daysIn(y, m) : 1;
    const n = (a: number, b: number) => Math.round(between(a, b) * scale);
    add(n(7, 10), 14, 48, C.super.id, shops.super);
    add(n(5, 9), 6, 32, C.fuera.id, shops.fuera);
    add(n(2, 4), 18, 45, C.transp.id, shops.transp);
    add(n(1, 4), 8, 40, C.ocio.id, shops.ocio);
    if (rand() < 0.45) add(1, 20, 75, C.ropa.id, shops.ropa);
    add(n(1, 3), 5, 35, C.otros.id, shops.otros);
    if (m === 8 && !isNow) add(1, 420, 680, C.ocio.id, ['Viaje verano']);
    if (m === 12 && !isNow) add(2, 60, 140, C.otros.id, ['Regalos Navidad']);
    if (rand() < 0.15 && !isNow) { const a = between(40, 160); tx(day(10 + Math.floor(rand() * 10)), a, 'Bizum devolución', C.otrosIn.id, ing); bal.ing += a; }

    // Foto del patrimonio a final de mes (o hoy).
    const value = (k: Asset) => qty[k] * path[k][i];
    const byAccount = {
      [ing]: r2(bal.ing), [tr]: r2(bal.tr + value('apple')), [mi]: r2(bal.mi + value('world') + value('em')), [bp]: r2(value('btc') + value('eth')),
    };
    const byKind = { cash: r2(bal.ing + bal.tr + bal.mi), fund: r2(value('world') + value('em')), stock: r2(value('apple')), crypto: r2(value('btc') + value('eth')) };
    const net = r2(Object.values(byKind).reduce((s, v) => s + v, 0));
    snapshots.push({ id: ids('5a'), user_id: U, date: day(last), net_worth: net, by_account: byAccount, by_kind: byKind });
  }

  // Los movimientos de hace más de un año no se cargan: el saldo arranca con un ajuste en esa fecha.
  const adjustDate = (() => { const d = new Date(Date.UTC(ty, tm - 13, 0)); return d.toISOString().slice(0, 10); })();
  const balanceAt = (accountId: string, cashHolding: string) => {
    let b = 0;
    for (const e of events) if (e.holding_id === cashHolding && String(e.date) <= adjustDate) b += Number(e.amount_eur);
    for (const t of transactions) {
      if (String(t.date) > adjustDate) continue;
      if (t.account_id === accountId) b += Number(t.amount);
      if (t.transfer_account_id === accountId) b -= Number(t.amount);
    }
    const held = holdings.filter((h) => h.account_id === accountId && h.kind !== 'cash').map((h) => h.id);
    for (const e of events) if (held.includes(String(e.holding_id)) && String(e.date) <= adjustDate && e.type === 'buy') b -= Number(e.amount_eur);
    return r2(b);
  };
  for (const [acc, h] of [[ing, H.ingCash.id], [tr, H.trCash.id], [mi, H.miCash.id]] as const) {
    ev(h, adjustDate, 'balance_adjust', balanceAt(acc, h), null, null);
  }

  // Foto diaria de los últimos días: del cierre del mes pasado a hoy, con poco ruido, para que la gráfica no dé saltos.
  const lastSnap = snapshots[snapshots.length - 1];
  const prevSnap = snapshots[snapshots.length - 2];
  const from = Number(prevSnap.net_worth), to = Number(lastSnap.net_worth);
  for (let k = 1; k < td; k++) {
    const d = iso(ty, tm, k);
    const f = k / td;
    snapshots.push({ ...lastSnap, id: ids('5a'), date: d, net_worth: r2((from + (to - from) * f) * (1 + (rand() - 0.5) * 0.004)) });
  }

  const price_cache = (Object.keys(assets) as Asset[]).map((k) => ({
    coingecko_id: assets[k].key, price_eur: assets[k].now, change_24h: assets[k].ch, updated_at: now.toISOString(),
  }));

  return {
    settings: [{
      user_id: U, big_expense_threshold: 150, timezone: 'Europe/Madrid', net_worth_target: 75000, shortcut_token_hash: null,
      profile: { age: 28, situation: 'employee', housing: 'rent', dependents: 0, goals: ['house', 'invest', 'freedom'], risk: 'medium', horizon: 'long', experience: 'some', debts: false, notes: '' },
      advisor_day: null, advisor_count: 0,
    }],
    accounts,
    account_rates: [{ id: ids('7a'), user_id: U, account_id: tr, rate: apr, from_date: '2023-11-01' }],
    categories,
    holdings,
    holding_events: events,
    transactions,
    recurring,
    snapshots: snapshots.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    price_cache,
    alerts: [],
    ai_summaries: [],
    holding_profiles: [],
    push_subscriptions: [],
    verified_sessions: [],
    monthly_goals: [],
  };
}
