'use client';

import { useState, useTransition } from 'react';
import { updateSettings } from '@/lib/actions/settings';
import { parseAmount } from '@/lib/format';
import { Field, inputClass } from '@/components/ui/field';

export function SettingsForm({ bigExpenseThreshold }: { bigExpenseThreshold: number }) {
  const [value, setValue] = useState(String(bigExpenseThreshold).replace('.', ','));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = parseAmount(value);
    if (!n) {
      setSaved(false);
      setError('Introduce un importe mayor que 0');
      return;
    }
    setError(null);
    start(async () => {
      const r = await updateSettings({ bigExpenseThreshold: n });
      setSaved(r.ok);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Avisarme de gastos mayores de (€)">
            <input className={`${inputClass} num`} inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); setError(null); }} />
          </Field>
        </div>
        <button disabled={pending} className="rounded-control bg-accent px-4 py-3 text-small font-medium text-accent-ink disabled:opacity-40">
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
      {error && <p role="alert" className="text-small text-loss">{error}</p>}
    </form>
  );
}
