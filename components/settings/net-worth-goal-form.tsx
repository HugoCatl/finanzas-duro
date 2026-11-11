'use client';

import { useState, useTransition } from 'react';
import { updateNetWorthTarget } from '@/lib/actions/settings';
import { parseAmount } from '@/lib/format';
import { Field, inputClass } from '@/components/ui/field';
import { toast } from '@/components/ui/toaster';

export function NetWorthGoalForm({ target }: { target: number | null }) {
  const [value, setValue] = useState(target !== null ? String(target).replace('.', ',') : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const empty = value.trim() === '';
    const n = empty ? null : parseAmount(value);
    if (!empty && !n) {
      setError('Introduce un importe mayor que 0');
      return;
    }
    setError(null);
    start(async () => {
      const r = await updateNetWorthTarget(n);
      if (r.ok) toast(n === null ? 'Objetivo quitado' : 'Objetivo guardado');
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Quiero llegar a (€). Vacío = sin objetivo">
            <input className={`${inputClass} num`} inputMode="decimal" value={value} placeholder="20.000"
              onChange={(e) => { setValue(e.target.value); setError(null); }} />
          </Field>
        </div>
        <button disabled={pending} className="rounded-control bg-accent px-4 py-3 text-small font-medium text-accent-ink disabled:opacity-40">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
    </form>
  );
}
