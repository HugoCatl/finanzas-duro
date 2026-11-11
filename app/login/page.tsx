'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { clearOfflineCache } from '@/lib/pwa/cache';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Llegar a /login implica sesión cerrada: no dejar datos financieros en la caché offline.
  useEffect(() => { clearOfflineCache(); }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await createBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError('Email o contraseña incorrectos');
        setBusy(false);
        return;
      }
      router.replace('/login/frase');
    } catch {
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-control border border-line bg-surface-2 px-4 py-3.5 outline-none focus:border-accent';
  const button = 'w-full rounded-control bg-accent py-3.5 font-medium text-accent-ink disabled:opacity-50';

  return (
    <main className="stagger pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-title">Finanzas</h1>
        <p className="mt-1 text-muted">Todo tu dinero en un sitio.</p>
      </div>
      <form onSubmit={signIn} className="flex flex-col gap-3">
        <input className={input} type="email" required autoComplete="email" placeholder="tu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required autoComplete="current-password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={button} disabled={busy}>{busy ? 'Entrando…' : 'Continuar'}</button>
      </form>
      {error && <p role="alert" className="animate-fade-in text-small text-loss">{error}</p>}
    </main>
  );
}
