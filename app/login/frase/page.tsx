'use client';

import { useState, useTransition } from 'react';
import { signOut } from '@/lib/actions/settings';
import { verifyPassphrase } from './actions';

export default function PassphrasePage() {
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await verifyPassphrase(phrase);
        if (result && !result.ok) setError(result.error);
      } catch {
        setError('No se pudo comprobar la frase');
      }
    });
  }

  const input = 'w-full rounded-control border border-line bg-surface-2 px-4 py-3.5 outline-none focus:border-accent';
  const button = 'w-full rounded-control bg-accent py-3.5 font-medium text-accent-ink disabled:opacity-50';

  return (
    <main className="stagger pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-title">Finanzas</h1>
        <p className="mt-1 text-muted">Escribe tu frase de acceso de 10 palabras.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea className={`${input} resize-none`} rows={3} required autoComplete="off" autoCapitalize="none"
          autoCorrect="off" spellCheck={false} placeholder="palabra1 palabra2 … palabra10"
          value={phrase} onChange={(e) => setPhrase(e.target.value)} />
        <button className={button} disabled={pending}>{pending ? 'Comprobando…' : 'Entrar'}</button>
      </form>
      <button type="button" className="text-small text-muted" onClick={() => startTransition(async () => { await signOut(); })}>
        Cerrar sesión / usar otra cuenta
      </button>
      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
    </main>
  );
}
