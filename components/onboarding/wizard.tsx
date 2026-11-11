'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Plus, Search, X } from 'lucide-react';
import type { Category } from '@/lib/types';
import { completeOnboarding, searchAssets } from '@/lib/actions/onboarding';
import { saveProfile } from '@/lib/actions/profile';
import { EMPTY_PROFILE, type Profile } from '@/lib/profile';
import { ProfileFields } from '@/components/advisor/profile-form';
import { ASSET_GROUPS, BANKS, SUBSCRIPTIONS, assetId, type AssetOption } from '@/lib/onboarding/catalog';
import type { OnboardingInput } from '@/lib/onboarding/validate';
import { eur, parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';

type Bank = { name: string; color: string; existing: boolean; cash: string };
type Asset = { opt: AssetOption; bank: string; value: string; invested: string };
type Sub = { name: string; amount: string; day: string };

const STEPS = ['Bienvenida', 'Tus bancos', 'Cuánto tienes', 'Inversiones', 'Nómina y fijos', 'Presupuesto', 'Sobre ti'];
const KIND_HINT = { crypto: 'Cripto', fund: 'Fondo / ETF', stock: 'Acción' } as const;
const fmt = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

export function OnboardingWizard({ existingAccounts, categories, target: currentTarget }: {
  existingAccounts: { name: string; color: string }[]; categories: Category[]; target: number | null;
}) {
  const router = useRouter();
  const online = useOnline();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [banks, setBanks] = useState<Bank[]>(existingAccounts.map((a) => ({ ...a, existing: true, cash: '' })));
  const [customBank, setCustomBank] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetOption[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [salary, setSalary] = useState({ on: true, amount: '', day: '28', bank: '' });
  const [subs, setSubs] = useState<Sub[]>([]);
  const [customSub, setCustomSub] = useState('');
  const [spendingBank, setSpendingBank] = useState('');
  const expenseCats = categories.filter((c) => c.kind === 'expense');
  const [limits, setLimits] = useState<Record<string, string>>(Object.fromEntries(expenseCats.map((c) => [c.id, fmt(c.monthlyLimit)])));
  const [target, setTarget] = useState(fmt(currentTarget ?? 20000));
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  const bankNames = banks.map((b) => b.name);
  const defaultBank = banks.find((b) => !b.existing)?.name ?? banks[0]?.name ?? '';

  function toggleBank(name: string, color: string) {
    setBanks((bs) => bs.some((b) => b.name.toLowerCase() === name.toLowerCase())
      ? bs.filter((b) => b.existing || b.name.toLowerCase() !== name.toLowerCase())
      : [...bs, { name, color, existing: false, cash: '' }]);
  }
  function addCustomBank() {
    const name = customBank.trim();
    if (name && !banks.some((b) => b.name.toLowerCase() === name.toLowerCase())) toggleBank(name, '#64748b');
    setCustomBank('');
  }
  function toggleAsset(opt: AssetOption) {
    const id = assetId(opt);
    setAssets((as) => as.some((a) => assetId(a.opt) === id)
      ? as.filter((a) => assetId(a.opt) !== id)
      : [...as, { opt, bank: defaultBank, value: '', invested: '' }]);
  }
  const setAsset = (id: string, patch: Partial<Asset>) => setAssets((as) => as.map((a) => (assetId(a.opt) === id ? { ...a, ...patch } : a)));
  function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    startSearch(async () => setResults(await searchAssets(query).catch(() => [])));
  }
  function toggleSub(name: string, amount: number) {
    setSubs((ss) => ss.some((s) => s.name === name) ? ss.filter((s) => s.name !== name) : [...ss, { name, amount: fmt(amount), day: '1' }]);
  }
  const setSub = (name: string, patch: Partial<Sub>) => setSubs((ss) => ss.map((s) => (s.name === name ? { ...s, ...patch } : s)));

  /** Comprueba el paso actual; devuelve un error para mostrar o null. */
  function check(): string | null {
    if (step === 1 && banks.length === 0) return 'Elige al menos un banco';
    if (step === 2) {
      const bad = banks.find((b) => b.cash.trim() !== '' && parseAmount(b.cash, { allowZero: true }) === null);
      if (bad) return `Revisa el saldo de ${bad.name}`;
    }
    if (step === 3) {
      const bad = assets.find((a) => !(parseAmount(a.value) ?? 0) || (a.invested.trim() !== '' && parseAmount(a.invested, { allowZero: true }) === null));
      if (bad) return `Indica cuánto vale hoy ${bad.opt.name}`;
    }
    if (step === 5) {
      const targetN = target.trim() === '' ? null : parseAmount(target);
      if (target.trim() !== '' && targetN === null) return 'Objetivo no válido';
    }
    if (step === 6 && profile.age !== null && (profile.age < 14 || profile.age > 110)) return 'Revisa tu edad';
    if (step === 4) {
      if (salary.on && (parseAmount(salary.amount) === null || !salary.bank)) return 'Indica tu nómina y dónde la cobras, o desmárcala';
      const bad = subs.find((s) => parseAmount(s.amount) === null || !(Number(s.day) >= 1 && Number(s.day) <= 31));
      if (bad) return `Revisa ${bad.name}`;
      if (subs.length > 0 && !spendingBank) return 'Elige de qué banco salen las suscripciones';
    }
    return null;
  }

  function next() {
    const problem = check();
    if (problem) { setError(problem); return; }
    setError(null);
    if (step === 3) {
      if (!salary.bank) setSalary((s) => ({ ...s, bank: defaultBank }));
      if (!spendingBank) setSpendingBank(defaultBank);
    }
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo({ top: 0 }); return; }
    finish();
  }

  function finish() {
    const targetN = target.trim() === '' ? null : parseAmount(target);
    if (target.trim() !== '' && targetN === null) { setError('Objetivo no válido'); return; }
    const input: OnboardingInput = {
      banks: banks.map((b) => ({
        name: b.name, color: b.color,
        cash: b.cash.trim() === '' ? (b.existing ? null : 0) : parseAmount(b.cash, { allowZero: true }),
      })),
      assets: assets.map((a) => ({
        name: a.opt.name, kind: a.opt.kind, coingeckoId: a.opt.coingeckoId, priceSymbol: a.opt.priceSymbol, bank: a.bank,
        valueEur: parseAmount(a.value)!, investedEur: a.invested.trim() === '' ? null : parseAmount(a.invested, { allowZero: true }),
      })),
      salary: salary.on ? { amount: parseAmount(salary.amount)!, day: Number(salary.day), bank: salary.bank } : null,
      subscriptions: subs.map((s) => ({ name: s.name, amount: parseAmount(s.amount)!, day: Number(s.day) })),
      spendingBank: subs.length ? spendingBank : null,
      limits: expenseCats
        .filter((c) => (limits[c.id] ?? '') !== fmt(c.monthlyLimit))
        .map((c) => ({ categoryId: c.id, limit: limits[c.id].trim() === '' ? 0 : parseAmount(limits[c.id], { allowZero: true }) ?? -1 })),
      target: targetN,
    };
    if (input.limits.some((l) => l.limit < 0)) { setError('Revisa los límites'); return; }
    start(async () => {
      const r = await completeOnboarding(input);
      if (!r.ok) { setError(r.error); return; }
      if (JSON.stringify(profile) !== JSON.stringify(EMPTY_PROFILE)) await saveProfile(profile).catch(() => null);
      try { localStorage.removeItem('finanzas:tour-done'); } catch {}
      router.push('/?tour=1');
    });
  }

  const chip = (on: boolean) => `flex items-center gap-2 rounded-full border px-3.5 py-2 text-small transition ${on ? 'border-accent bg-accent text-accent-ink' : 'border-transparent bg-surface-2 text-muted'}`;
  const selectedIds = new Set(assets.map((a) => assetId(a.opt)));
  const assetChip = (opt: AssetOption) => {
    const on = selectedIds.has(assetId(opt));
    return (
      <button type="button" key={assetId(opt)} onClick={() => toggleAsset(opt)} className={chip(on)}>
        {on ? <Check size={14} /> : <Plus size={14} className="text-muted" />}
        <span>{opt.name}</span>
        {opt.hint && <span className={`text-small ${on ? 'opacity-70' : 'text-muted'}`}>{opt.hint}</span>}
      </button>
    );
  };
  const bankSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <select aria-label={label} className={`${inputClass} py-2.5`} value={value} onChange={(e) => onChange(e.target.value)}>
      {bankNames.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-6">
      <header className="mb-6 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => { setError(null); setStep(step - 1); }} aria-label="Atrás" className="grid size-9 place-items-center rounded-full bg-surface">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-line'}`} />)}
        </div>
        {existingAccounts.length > 0 && <Link href="/" className="text-small text-muted">Salir</Link>}
      </header>

      <main className="flex flex-1 flex-col gap-5">
        {step === 0 && (
          <div className="flex flex-1 flex-col justify-center gap-4">
            <h1 className="text-title">Vamos a poner tu dinero en orden</h1>
            <p className="text-muted">En unos pasos cortos: qué bancos usas, cuánto tienes en cada uno, en qué inviertes, tu nómina y fijos, cuánto quieres gastar y un poco sobre ti para que Duro, tu asesor, te aconseje a medida. Todo se puede cambiar luego.</p>
            <ul className="flex flex-col gap-2 text-small text-muted">
              <li>· Las inversiones se actualizan solas con su precio.</li>
              <li>· Los gastos que apuntes restan de la cuenta que elijas.</li>
              <li>· Nada sale de la app: solo lo ves tú.</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <>
            <Title title="¿Qué bancos usas?" sub="Marca todos: bancos, brokers y exchanges de cripto." />
            <div className="flex flex-wrap gap-2">
              {[...BANKS, ...banks.filter((b) => !BANKS.some((x) => x.name.toLowerCase() === b.name.toLowerCase()))].map((b) => {
                const sel = banks.find((x) => x.name.toLowerCase() === b.name.toLowerCase());
                return (
                  <button type="button" key={b.name} disabled={sel?.existing} onClick={() => toggleBank(b.name, b.color)} className={chip(!!sel)}>
                    <span className="size-2.5 rounded-full" style={{ background: b.color }} />
                    {b.name}{sel?.existing && <span className="text-small opacity-70">ya la tienes</span>}
                  </button>
                );
              })}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCustomBank(); }} className="flex gap-2">
              <input className={inputClass} placeholder="Otro banco" value={customBank} onChange={(e) => setCustomBank(e.target.value)} maxLength={40} />
              <button className="shrink-0 rounded-control bg-surface px-4 text-small font-medium">Añadir</button>
            </form>
            <p className="text-small text-muted">{banks.length} {banks.length === 1 ? 'banco' : 'bancos'}</p>
          </>
        )}

        {step === 2 && (
          <>
            <Title title="¿Cuánto tienes en cada uno?" sub="Solo el dinero en cuenta, sin las inversiones (esas van en el paso siguiente)." />
            <div className="flex flex-col gap-3">
              {banks.map((b, i) => (
                <label key={b.name} className="flex items-center gap-3 rounded-control bg-surface px-4 py-3">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
                  <span className="flex-1 font-medium">{b.name}</span>
                  <input className="num w-32 rounded-xl border border-line bg-surface-2 px-3 py-2 text-right outline-none focus:border-accent" inputMode="decimal"
                    placeholder={b.existing ? 'Sin cambios' : '0,00'} value={b.cash}
                    onChange={(e) => setBanks((bs) => bs.map((x, j) => (j === i ? { ...x, cash: e.target.value } : x)))} />
                  <span className="text-muted">€</span>
                </label>
              ))}
            </div>
            <p className="text-small text-muted">
              Total <span className="num text-text">{eur(banks.reduce((s, b) => s + (parseAmount(b.cash, { allowZero: true }) ?? 0), 0))}</span>
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <Title title="¿En qué inviertes?" sub="Elige de la lista o busca. El precio se actualiza solo." />
            {ASSET_GROUPS.map((g) => (
              <section key={g.title}>
                <h2 className="mb-2 text-small font-medium text-muted">{g.title}</h2>
                <div className="flex flex-wrap gap-2">{g.assets.map(assetChip)}</div>
              </section>
            ))}
            <form onSubmit={search} className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${inputClass} pl-11`} placeholder="Buscar otro (nombre, ISIN o código)" value={query} onChange={(e) => setQuery(e.target.value)} />
            </form>
            {searching && <p className="text-small text-muted">Buscando…</p>}
            {results && !searching && (
              results.length === 0
                ? <p className="text-small text-muted">Nada que cotice en euros con ese nombre. Prueba con el ISIN (lo ves en tu banco, empieza por IE, LU o ES).</p>
                : <div className="flex flex-wrap gap-2">{results.map((a) => assetChip({ ...a, hint: `${KIND_HINT[a.kind]}${a.hint ? ` · ${a.hint}` : ''}` }))}</div>
            )}

            {assets.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-small font-medium text-muted">Tus inversiones</h2>
                {assets.map((a) => {
                  const id = assetId(a.opt);
                  return (
                    <div key={id} className="flex flex-col gap-3 rounded-control bg-surface p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{a.opt.name}</span>
                        <button type="button" onClick={() => toggleAsset(a.opt)} aria-label={`Quitar ${a.opt.name}`} className="text-muted"><X size={18} /></button>
                      </div>
                      {bankSelect(a.bank, (v) => setAsset(id, { bank: v }), `Banco de ${a.opt.name}`)}
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vale hoy (€)"><input className={`${inputClass} num py-2.5`} inputMode="decimal" value={a.value} onChange={(e) => setAsset(id, { value: e.target.value })} /></Field>
                        <Field label="Metiste (€, opcional)"><input className={`${inputClass} num py-2.5`} inputMode="decimal" placeholder="Igual" value={a.invested} onChange={(e) => setAsset(id, { invested: e.target.value })} /></Field>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <Title title="Nómina y gastos fijos" sub="Se apuntan solos cada mes en su día." />
            <section className="flex flex-col gap-3 rounded-control bg-surface p-4">
              <label className="flex items-center gap-3 font-medium">
                <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={salary.on} onChange={(e) => setSalary({ ...salary, on: e.target.checked })} />
                Cobro una nómina
              </label>
              {salary.on && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cuánto (€)"><input className={`${inputClass} num py-2.5`} inputMode="decimal" value={salary.amount} onChange={(e) => setSalary({ ...salary, amount: e.target.value })} /></Field>
                    <Field label="Qué día"><input className={`${inputClass} num py-2.5`} inputMode="numeric" value={salary.day} onChange={(e) => setSalary({ ...salary, day: e.target.value })} /></Field>
                  </div>
                  <Field label="Dónde la cobras">{bankSelect(salary.bank, (v) => setSalary({ ...salary, bank: v }), 'Banco de la nómina')}</Field>
                </>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-small font-medium text-muted">Suscripciones y recibos</h2>
              <div className="flex flex-wrap gap-2">
                {[...SUBSCRIPTIONS, ...subs.filter((s) => !SUBSCRIPTIONS.some((x) => x.name === s.name)).map((s) => ({ name: s.name, amount: parseAmount(s.amount) ?? 0 }))].map((s) => {
                  const on = subs.some((x) => x.name === s.name);
                  return (
                    <button type="button" key={s.name} onClick={() => toggleSub(s.name, s.amount)} className={chip(on)}>
                      {on ? <Check size={14} /> : <Plus size={14} className="text-muted" />}{s.name}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const n = customSub.trim(); if (n && !subs.some((s) => s.name === n)) toggleSub(n, 0); setCustomSub(''); }} className="flex gap-2">
                <input className={inputClass} placeholder="Otro (alquiler, luz, seguro…)" value={customSub} onChange={(e) => setCustomSub(e.target.value)} maxLength={60} />
                <button className="shrink-0 rounded-control bg-surface px-4 text-small font-medium">Añadir</button>
              </form>
              {subs.map((s) => (
                <div key={s.name} className="flex items-center gap-2 rounded-control bg-surface px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <input aria-label={`Importe de ${s.name}`} className="num w-20 rounded-xl border border-line bg-surface-2 px-2 py-1.5 text-right outline-none" inputMode="decimal" value={s.amount} onChange={(e) => setSub(s.name, { amount: e.target.value })} />
                  <span className="text-small text-muted">€ día</span>
                  <input aria-label={`Día de ${s.name}`} className="num w-12 rounded-xl border border-line bg-surface-2 px-2 py-1.5 text-right outline-none" inputMode="numeric" value={s.day} onChange={(e) => setSub(s.name, { day: e.target.value })} />
                </div>
              ))}
              {subs.length > 0 && <Field label="Se pagan desde">{bankSelect(spendingBank, setSpendingBank, 'Banco de las suscripciones')}</Field>}
            </section>
          </>
        )}

        {step === 5 && (
          <>
            <Title title="¿Cuánto quieres gastar al mes?" sub="Un límite por categoría. Deja vacío lo que no quieras limitar." />
            <div className="flex flex-col gap-2">
              {expenseCats.map((c) => (
                <label key={c.id} className="flex items-center gap-3 rounded-control bg-surface px-4 py-2.5">
                  <span className="flex-1">{c.name}</span>
                  <input className="num w-24 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-right outline-none focus:border-accent" inputMode="decimal" placeholder="Sin límite"
                    value={limits[c.id] ?? ''} onChange={(e) => setLimits({ ...limits, [c.id]: e.target.value })} />
                  <span className="text-muted">€</span>
                </label>
              ))}
            </div>
            <p className="text-small text-muted">
              Total <span className="num text-text">{eur(Object.values(limits).reduce((s, v) => s + (parseAmount(v, { allowZero: true }) ?? 0), 0), { whole: true })}</span> al mes
            </p>
            <Field label="Objetivo de patrimonio (€)">
              <input className={`${inputClass} num`} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Sin objetivo" />
            </Field>
          </>
        )}
        {step === 6 && (
          <>
            <Title title="Cuéntanos sobre ti" sub="Así Duro, tu asesor, te aconseja según tu edad, tus planes y cómo llevas el riesgo. Puedes saltarte lo que quieras." />
            <ProfileFields value={profile} onChange={setProfile} />
          </>
        )}
      </main>

      <footer className="sticky bottom-0 mt-6 flex flex-col gap-3 bg-bg pb-2 pt-3">
        {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
        <PrimaryButton onClick={next} disabled={pending || (step === STEPS.length - 1 && !online)}>
          {pending ? 'Guardando…' : step === 0 ? 'Empezar' : step === STEPS.length - 1 ? 'Terminar' : 'Siguiente'}
        </PrimaryButton>
      </footer>
    </div>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted">{sub}</p>
    </div>
  );
}
