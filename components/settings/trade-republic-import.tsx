'use client';

import { useState, useTransition } from 'react';
import { FileUp } from 'lucide-react';
import { importTradeRepublic, type ImportResult } from '@/lib/actions/import';
import { IMPORT_SINCE } from '@/lib/import/plan';
import { parseTradeRepublic, type TradeRepublicImport } from '@/lib/import/trade-republic';
import { eur } from '@/lib/format';
import { useOnline } from '@/lib/hooks/use-online';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/field';
import { toast } from '@/components/ui/toaster';

export function TradeRepublicImport() {
  const online = useOnline();
  const [text, setText] = useState<string | null>(null);
  const [own, setOwn] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult['added'] | null>(null);
  const [pending, start] = useTransition();

  let preview: TradeRepublicImport | null = null;
  if (text !== null) {
    try {
      preview = parseTradeRepublic(text, { since: IMPORT_SINCE, own });
    } catch {
      preview = null;
    }
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (!file) return;
    const content = await file.text();
    try {
      const first = parseTradeRepublic(content, { since: IMPORT_SINCE });
      setOwn(first.counterparties.filter((c) => c.own).map((c) => c.key));
      setText(content);
    } catch (err) {
      setText(null);
      setError(err instanceof Error ? err.message : 'No se pudo leer el fichero');
    }
  }

  function toggle(key: string) {
    setOwn((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function confirm() {
    if (text === null) return;
    setError(null);
    start(async () => {
      const r = await importTradeRepublic(text, own);
      if (r.ok) {
        setResult(r.added ?? null);
        setText(null);
        toast('Importación hecha');
      } else setError(r.error);
    });
  }

  const expenses = preview?.transactions.filter((t) => t.amount < 0) ?? [];
  const income = preview?.transactions.filter((t) => t.amount > 0) ?? [];
  const sum = (xs: { amount: number }[]) => xs.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-small text-muted">
          En Trade Republic: Perfil → Ajustes → Exportar transacciones (CSV). Solo se importan movimientos desde el 1 de enero de 2026,
          y volver a subir el mismo fichero no duplica nada.
        </p>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-line px-4 py-6 text-small font-medium">
          <FileUp size={18} /> {text === null ? 'Elegir CSV' : 'Elegir otro CSV'}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={pick} />
        </label>
      </Card>

      {preview && (
        <Card className="animate-rise">
          <h2 className="mb-3 text-heading">Vas a importar</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-small">
            <Row label={`${expenses.length} gastos`} value={eur(sum(expenses))} />
            <Row label={`${income.length} ingresos`} value={eur(sum(income))} />
            <Row label={`${preview.trades.length} compras y ventas`} value={eur(preview.trades.reduce((s, t) => s + t.amountEur, 0))} />
            <Row label="Traspasos entre tus cuentas" value={`${preview.skipped.ownTransfers} ignorados`} />
          </dl>
          {(preview.skipped.old > 0 || preview.skipped.unknown > 0) && (
            <p className="mt-3 text-small text-muted">
              Se saltan {preview.skipped.old} anteriores a 2026{preview.skipped.unknown > 0 && ` y ${preview.skipped.unknown} de tipo desconocido`}.
            </p>
          )}

          {preview.counterparties.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-small font-medium">¿Cuáles son cuentas tuyas?</h3>
              <ul className="flex flex-col gap-1">
                {preview.counterparties.map((c) => (
                  <li key={c.key}>
                    <label className="flex items-center gap-3 rounded-xl px-1 py-2 text-small">
                      <input type="checkbox" className="size-4 accent-[var(--text)]" checked={own.includes(c.key)} onChange={() => toggle(c.key)} />
                      <span className="flex-1 truncate">{c.name}{c.key.length > 4 && <span className="text-muted"> ··{c.key.slice(-4)}</span>}</span>
                      <span className="text-muted">{c.count}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-small text-muted">Los traspasos con tus cuentas no cuentan como gasto ni ingreso.</p>
            </>
          )}

          <PrimaryButton className="mt-5" onClick={confirm} disabled={pending || !online}>
            {pending ? 'Importando…' : 'Importar'}
          </PrimaryButton>
        </Card>
      )}

      {result && (
        <Card className="animate-rise">
          <h2 className="mb-2 text-heading">Listo</h2>
          <p className="text-small text-muted">
            {result.transactions} movimientos y {result.trades} compras nuevas.
            {result.duplicates > 0 && ` ${result.duplicates} ya estaban.`}
            {result.skippedRecurring > 0 && ` ${result.skippedRecurring} cargos ya apuntados por tus fijos.`}
          </p>
        </Card>
      )}

      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
