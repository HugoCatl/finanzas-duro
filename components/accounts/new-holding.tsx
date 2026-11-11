'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import type { HoldingKind } from '@/lib/types';
import { createHolding } from '@/lib/actions/holdings';
import { parseAmount } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { KIND_LABELS } from '@/lib/labels';

export function NewHolding({ accountId, today }: { accountId: string; today: string }) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<HoldingKind>('cash');
  const [name, setName] = useState('');
  const [apy, setApy] = useState('');
  const [coingeckoId, setCoingeckoId] = useState('');
  const [isin, setIsin] = useState('');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const listed = kind === 'fund' || kind === 'stock';
  // Cripto, acciones y fondos con código de Yahoo se llevan por participaciones.
  const byUnits = kind === 'crypto' || kind === 'stock' || (kind === 'fund' && symbol.trim() !== '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Un importe escrito pero ilegible no debe guardarse en silencio como 0.
    const parsed = parseAmount(amount, { allowZero: true });
    if (amount.trim() !== '' && parsed === null) {
      setError('Importe no válido');
      return;
    }
    start(async () => {
      const r = await createHolding({
        accountId, name, kind, date,
        apyPct: kind === 'savings' && apy ? Number(apy.replace(',', '.')) : null,
        coingeckoId: kind === 'crypto' ? coingeckoId : null,
        isin: listed ? isin : null,
        priceSymbol: listed ? symbol : null,
        amountEur: parsed ?? 0,
        quantity: byUnits ? Number(quantity.replace(',', '.')) : null,
      });
      if (r.ok) {
        setOpen(false);
        setName(''); setApy(''); setCoingeckoId(''); setIsin(''); setSymbol(''); setAmount(''); setQuantity('');
      } else setError(r.error);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-small font-medium text-accent-ink">
        <Plus size={16} /> Añadir
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva posición">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-1 rounded-control bg-surface-2 p-1 text-small font-medium">
            {(Object.keys(KIND_LABELS) as HoldingKind[]).map((k) => (
              <button type="button" key={k} onClick={() => setKind(k)}
                className={`rounded-xl py-2 ${kind === k ? 'bg-accent font-medium text-accent-ink' : 'text-muted'}`}>{KIND_LABELS[k]}</button>
            ))}
          </div>
          <Field label="Nombre">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required
              placeholder={kind === 'crypto' ? 'Bitcoin' : kind === 'fund' ? 'MSCI World' : kind === 'stock' ? 'Alphabet' : kind === 'savings' ? 'Cuenta remunerada' : 'Cuenta corriente'} />
          </Field>
          {kind === 'savings' && (
            <Field label="TAE (%)"><input className={inputClass} inputMode="decimal" value={apy} onChange={(e) => setApy(e.target.value)} placeholder="2,25" /></Field>
          )}
          {kind === 'crypto' && (
            <>
              <Field label="Id de CoinGecko (p. ej. bitcoin, ethereum, solana)">
                <input className={inputClass} autoCapitalize="none" value={coingeckoId} onChange={(e) => setCoingeckoId(e.target.value)} required />
              </Field>
            </>
          )}
          {listed && (
            <>
              <Field label="Código de Yahoo Finance para el precio (p. ej. ABEA.DE)">
                <input className={inputClass} autoCapitalize="characters" value={symbol} onChange={(e) => setSymbol(e.target.value)}
                  required={kind === 'stock'} />
              </Field>
              <Field label="ISIN (opcional)"><input className={inputClass} autoCapitalize="characters" value={isin} onChange={(e) => setIsin(e.target.value)} /></Field>
            </>
          )}
          {byUnits && (
            <Field label={kind === 'crypto' ? 'Cantidad' : 'Participaciones'}>
              <input className={`${inputClass} num`} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>
          )}
          <Field label={byUnits ? 'Total pagado (€)' : kind === 'cash' ? 'Saldo actual (€)' : 'Importe aportado (€)'}>
            <input className={`${inputClass} num`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Fecha"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
          <PrimaryButton disabled={pending || !online}>{pending ? 'Guardando…' : 'Crear posición'}</PrimaryButton>
        </form>
      </Sheet>
    </>
  );
}
