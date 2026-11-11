'use client';

import { useState, useTransition } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import type { Account } from '@/lib/types';
import { createAccount, deleteAccount, updateAccount } from '@/lib/actions/accounts';
import { BANKS } from '@/lib/onboarding/catalog';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

const COLORS = ['#16a34a', '#0ea5e9', '#2563eb', '#7c3aed', '#c026a3', '#ec0000', '#ff6200', '#f0b90b', '#0f766e', '#a1a1aa', '#64748b', '#111111'];

/** Crea una cuenta (sin `account`) o edita y borra la que se pasa. */
export function AccountEditor({ account, summary }: { account?: Account; summary?: string }) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account?.name ?? '');
  const [color, setColor] = useState(account?.color ?? COLORS[0]);
  const [cash, setCash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const known = BANKS.filter((b) => b.name.toLowerCase().includes(name.trim().toLowerCase()) && b.name.toLowerCase() !== name.trim().toLowerCase());

  function reset() {
    setName(account?.name ?? ''); setColor(account?.color ?? COLORS[0]); setCash(''); setError(null);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const cashN = cash.trim() === '' ? null : parseAmount(cash, { allowZero: true });
    if (cash.trim() !== '' && cashN === null) { setError('Saldo no válido'); return; }
    setError(null);
    start(async () => {
      const r = account ? await updateAccount(account.id, { name, color }) : await createAccount({ name, color, cash: cashN });
      if (r.ok) { setOpen(false); toast(account ? 'Cuenta guardada' : 'Cuenta creada'); }
      else setError(r.error);
    });
  }

  function remove() {
    if (!account) return;
    if (!confirm(`¿Borrar ${account.name}?\n\nSe borran sus posiciones y los traspasos en los que participa. Sus gastos e ingresos se quedan, sin cuenta. No se puede deshacer.`)) return;
    setError(null);
    start(async () => {
      const r = await deleteAccount(account.id); // si va bien, lleva a Cuentas
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <>
      {account ? (
        <button onClick={() => { reset(); setOpen(true); }} aria-label="Editar cuenta" className="grid size-9 place-items-center rounded-full bg-surface text-muted">
          <Pencil size={16} />
        </button>
      ) : (
        <button onClick={() => { reset(); setOpen(true); }} className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-small font-medium text-accent-ink">
          <Plus size={16} /> Nueva
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={account ? 'Editar cuenta' : 'Nueva cuenta'}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Nombre">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required placeholder="ING, Revolut, hucha…" />
          </Field>
          {!account && name.trim().length > 0 && known.length > 0 && (
            <div className="-mt-2 flex flex-wrap gap-2">
              {known.slice(0, 4).map((b) => (
                <button type="button" key={b.name} onClick={() => { setName(b.name); setColor(b.color); }}
                  className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-small">
                  <span className="size-2.5 rounded-full" style={{ background: b.color }} />{b.name}
                </button>
              ))}
            </div>
          )}
          <fieldset className="flex flex-col gap-1.5 text-small">
            <legend className="mb-1.5 text-muted">Color</legend>
            <div className="flex flex-wrap gap-2">
              {[...new Set([color, ...COLORS])].map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                  className="grid size-9 place-items-center rounded-full text-white ring-offset-2 ring-offset-surface transition"
                  style={{ background: c, boxShadow: color === c ? '0 0 0 2px var(--text)' : undefined }}>
                  {color === c && <Check size={16} />}
                </button>
              ))}
            </div>
          </fieldset>
          {!account && (
            <Field label="Dinero en cuenta hoy (€, opcional)">
              <input className={`${inputClass} num`} inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0,00" />
            </Field>
          )}
          {account && summary && <p className="text-small text-muted">{summary}</p>}
          {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
          <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : account ? 'Guardar' : 'Crear cuenta'}</PrimaryButton>
          {account && (
            <button type="button" onClick={remove} disabled={pending || !online} className="text-small text-loss disabled:opacity-40">Borrar cuenta</button>
          )}
        </form>
      </Sheet>
    </>
  );
}
