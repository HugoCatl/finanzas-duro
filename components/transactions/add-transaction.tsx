'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { Account, Category } from '@/lib/types';
import { createTransaction } from '@/lib/actions/transactions';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';
import { saveOffline } from '@/components/pwa/pending-sync';
import { duro } from '@/lib/duro/store';
import { lastAccount, TransactionForm } from './transaction-form';
import { TransferForm } from './transfer-form';

type Mode = 'expense' | 'income' | 'transfer';
const MODES: Record<Mode, string> = { expense: 'Gasto', income: 'Ingreso', transfer: 'Traspaso' };
/** `?nuevo=gasto|ingreso|traspaso` abre el formulario directamente (accesos directos del icono de la app). */
const FROM_URL: Record<string, Mode> = { gasto: 'expense', ingreso: 'income', traspaso: 'transfer' };

function OpenFromUrl({ onOpen }: { onOpen: (mode: Mode) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const mode = FROM_URL[params.get('nuevo') ?? ''];
  useEffect(() => {
    if (!mode) return;
    const t = setTimeout(() => {
      onOpen(mode);
      router.replace(window.location.pathname, { scroll: false }); // que recargar no lo vuelva a abrir
    }, 0);
    return () => clearTimeout(t);
  }, [mode, onOpen, router]);
  return null;
}

export function AddTransaction({ categories, accounts, today, learned }: {
  categories: Category[]; accounts: Account[]; today: string; learned?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('expense');
  const remembered = open ? lastAccount() : null;
  const initialAccount = accounts.some((a) => a.id === remembered) ? remembered : accounts[0]?.id ?? null;
  const close = (message: string) => { setOpen(false); toast(message); };
  const [openAs] = useState(() => (m: Mode) => { setMode(m); setOpen(true); });

  return (
    <>
      <Suspense><OpenFromUrl onOpen={openAs} /></Suspense>
      {/* Botón flotante: la acción principal, la única sombra en reposo. taste-skill-ignore */}
      <button onClick={() => { setMode('expense'); setOpen(true); }} aria-label="Añadir movimiento" data-tour="add"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-5 z-30 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition active:scale-95 lg:bottom-10 lg:right-10">
        <Plus size={26} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo movimiento">
        {open && (
          <div className="flex flex-col gap-5">
            <Segmented label="Tipo de movimiento" size="md" value={mode} onChange={setMode} className="w-full"
              options={(Object.keys(MODES) as Mode[]).map((m) => ({ value: m, label: MODES[m] }))} />
            {mode === 'transfer' ? (
              <TransferForm accounts={accounts} today={today} onDone={() => close('Traspaso guardado')}
                onOffline={(input) => { saveOffline({ type: 'transfer', input }); close('Guardado; se subirá al volver la conexión'); }} />
            ) : (
              <TransactionForm key={mode} hideKind scan categories={categories} accounts={accounts} learned={learned} submitLabel="Guardar"
                initial={{ kind: mode, amount: null, categoryId: null, date: today, merchant: null, accountId: initialAccount }}
                onSubmit={async (input) => {
                  const r = await createTransaction(input);
                  // Duro reacciona: se preocupa si el gasto dispara un aviso y se alegra con lo que entra.
                  if (r.ok && r.warning) duro.react('worried', r.warning);
                  else if (r.ok && input.kind === 'income') duro.react('celebrating', '¡Dinero que entra!');
                  return r;
                }} onDone={() => close('Movimiento añadido')}
                onOffline={(input) => { saveOffline({ input }); close('Guardado; se subirá al volver la conexión'); }} />
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
