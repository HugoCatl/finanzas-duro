'use client';

import { useState, useTransition } from 'react';
import type { CategoryBudget } from '@/lib/finance/month';
import { setCategoryLimit } from '@/lib/actions/budget';
import { eur, parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

const limitText = (limit: number | null) => (limit !== null ? String(limit).replace('.', ',') : '');

export function CategoryLimit({ row }: { row: CategoryBudget }) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(limitText(row.limit));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { category, spent } = row;

  function openSheet() {
    setLimit(limitText(row.limit));
    setError(null);
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const empty = limit.trim() === '';
    const value = empty ? null : parseAmount(limit, { allowZero: true });
    if (!empty && value === null) {
      setError('Importe no válido');
      return;
    }
    setError(null);
    start(async () => {
      const r = await setCategoryLimit(category.id, value);
      if (r.ok) { setOpen(false); toast(value === null ? 'Límite quitado' : 'Límite guardado'); }
      else setError(r.error);
    });
  }

  return (
    <>
      <button onClick={openSheet} className="flex w-full flex-col gap-2 px-5 py-3.5 text-left">
        <div className="flex w-full items-center gap-3">
          <CategoryIcon icon={category.icon} className="text-muted" />
          <span className="flex-1 font-medium">{category.name}</span>
          <span className="num text-small">
            {eur(spent)}{row.limit !== null && <span className="text-muted"> / {eur(row.limit)}</span>}
          </span>
        </div>
        {row.limit !== null && <Progress pct={row.pct} level={row.level} />}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Límite de ${category.name}`}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Límite mensual (€). Vacío = sin límite">
            <input className={`${inputClass} num`} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </Field>
          <p className="text-small text-muted">Este mes llevas {eur(spent)}. Te avisaremos al 80 % y al 100 %.</p>
          {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
          <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : 'Guardar'}</PrimaryButton>
        </form>
      </Sheet>
    </>
  );
}
