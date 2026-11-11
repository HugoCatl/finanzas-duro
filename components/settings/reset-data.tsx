'use client';

import { useState, useTransition } from 'react';
import { resetAllData } from '@/lib/actions/settings';
import { inputClass } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';

const CONFIRMATION = 'BORRAR';

/** Borra todo para empezar de cero; pide escribir BORRAR antes. */
export function ResetData() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await resetAllData(text.trim());
      if (r && !r.ok) setError(r.error); // si va bien, la acción lleva al asistente de bienvenida
    });
  }

  return (
    <>
      <button onClick={() => { setText(''); setError(null); setOpen(true); }} className="w-full rounded-control bg-surface-2 px-4 py-3 text-left text-small text-loss">
        Borrar todos mis datos
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Borrar todos mis datos">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-small text-muted">
            Se borran tus cuentas, inversiones, movimientos, fijos, el historial de patrimonio y tus límites y objetivo.
            Se mantienen tu acceso y las categorías. <strong className="text-text">No se puede deshacer.</strong> Si quieres una copia, antes usa «Exportar todo (JSON)».
          </p>
          <label className="flex flex-col gap-1.5 text-small">
            <span className="text-muted">Escribe {CONFIRMATION} para confirmar</span>
            <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </label>
          {error && <p role="alert" className="text-small text-loss">{error}</p>}
          <button disabled={pending || text.trim() !== CONFIRMATION}
            className="w-full rounded-control bg-loss py-3.5 font-medium text-white transition disabled:opacity-40">
            {pending ? 'Borrando…' : 'Borrar y empezar de cero'}
          </button>
        </form>
      </Sheet>
    </>
  );
}
