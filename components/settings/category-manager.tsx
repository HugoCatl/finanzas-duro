'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import type { Account, Category, CategoryKind } from '@/lib/types';
import { deleteCategory, upsertCategory } from '@/lib/actions/budget';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { CATEGORY_ICONS, CategoryIcon } from '@/components/ui/category-icon';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';

type Draft = { id?: string; name: string; icon: string; kind: CategoryKind; isFixed: boolean; limit: string; accountId: string };
const empty: Draft = { name: '', icon: 'circle', kind: 'expense', isFixed: false, limit: '', accountId: '' };

export function CategoryManager({ categories, accounts }: { categories: Category[]; accounts: Account[] }) {
  const online = useOnline();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  function edit(c: Category) {
    setError(null);
    setDraft({ id: c.id, name: c.name, icon: c.icon, kind: c.kind, isFixed: c.isFixed, limit: c.monthlyLimit !== null ? String(c.monthlyLimit).replace('.', ',') : '', accountId: c.defaultAccountId ?? '' });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    let monthlyLimit: number | null = null;
    if (draft.kind === 'expense' && draft.limit.trim() !== '') {
      monthlyLimit = parseAmount(draft.limit, { allowZero: true });
      if (monthlyLimit === null) {
        setError('Límite no válido');
        return;
      }
    }
    setError(null);
    start(async () => {
      const r = await upsertCategory({
        id: draft.id, name: draft.name, icon: draft.icon, kind: draft.kind, isFixed: draft.isFixed, monthlyLimit,
        defaultAccountId: draft.accountId || null,
      });
      if (r.ok) setDraft(null);
      else setError(r.error);
    });
  }

  function remove() {
    if (!draft?.id || !confirm('¿Borrar la categoría? Los movimientos de esta categoría quedarán sin categoría.')) return;
    const id = draft.id;
    start(async () => {
      const r = await deleteCategory(id);
      if (r.ok) setDraft(null);
      else setError(r.error);
    });
  }

  return (
    <>
      {(['expense', 'income'] as const).map((kind) => (
        <div key={kind} className="mb-4">
          <p className="mb-2 text-small font-medium text-muted">{kind === 'expense' ? 'Gastos' : 'Ingresos'}</p>
          <div className="flex flex-wrap gap-2">
            {categories.filter((c) => c.kind === kind).map((c) => (
              <button key={c.id} onClick={() => edit(c)} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-small">
                <CategoryIcon icon={c.icon} size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => { setError(null); setDraft(empty); }} className="flex items-center gap-1.5 text-small font-medium text-text">
        <Plus size={16} /> Nueva categoría
      </button>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Editar categoría' : 'Nueva categoría'}>
        {draft && (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 rounded-control bg-surface-2 p-1 text-small font-medium">
              {(['expense', 'income'] as const).map((k) => (
                <button type="button" key={k} onClick={() => set({ kind: k })}
                  className={`rounded-xl py-2 ${draft.kind === k ? 'bg-accent font-medium text-accent-ink' : 'text-muted'}`}>{k === 'expense' ? 'Gasto' : 'Ingreso'}</button>
              ))}
            </div>
            <Field label="Nombre"><input className={inputClass} value={draft.name} onChange={(e) => set({ name: e.target.value })} required /></Field>
            <div>
              <p className="mb-1.5 text-small text-muted">Icono</p>
              <div className="grid grid-cols-6 gap-2">
                {Object.keys(CATEGORY_ICONS).map((icon) => (
                  <button type="button" key={icon} onClick={() => set({ icon })} aria-label={icon}
                    className={`grid aspect-square place-items-center rounded-xl ${draft.icon === icon ? 'bg-accent text-accent-ink' : 'bg-surface-2'}`}>
                    <CategoryIcon icon={icon} />
                  </button>
                ))}
              </div>
            </div>
            {draft.kind === 'expense' && (
              <Field label="Límite mensual (€, opcional)">
                <input className={`${inputClass} num`} inputMode="decimal" value={draft.limit} onChange={(e) => set({ limit: e.target.value })} />
              </Field>
            )}
            <Field label="Cuenta habitual (se propone al apuntar)">
              <select className={inputClass} value={draft.accountId} onChange={(e) => set({ accountId: e.target.value })}>
                <option value="">Ninguna</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-3 text-small">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={draft.isFixed} onChange={(e) => set({ isFixed: e.target.checked })} />
              Es un gasto/ingreso fijo
            </label>
            {error && <p role="alert" className="text-small text-loss">{error}</p>}
            <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : 'Guardar'}</PrimaryButton>
            {draft.id && <button type="button" onClick={remove} disabled={pending || !online} className="text-small text-loss">Borrar categoría</button>}
          </form>
        )}
      </Sheet>
    </>
  );
}
