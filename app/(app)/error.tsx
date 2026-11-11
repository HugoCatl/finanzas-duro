'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCw, WifiOff } from 'lucide-react';

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => { console.error(error); }, [error]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  return (
    <div className="mt-4 flex animate-rise flex-col items-start gap-3 rounded-card bg-surface p-5 lg:mt-0">
      {offline && <WifiOff size={22} className="text-muted" />}
      <h1 className="text-lg font-semibold">{offline ? 'Estás sin conexión' : 'No se pudo cargar esta pantalla'}</h1>
      <p className="text-small text-muted">
        {offline
          ? 'Cuando vuelva la red, toca Reintentar. Tus datos no se han tocado.'
          : 'Puede ser un fallo momentáneo del servidor o de los precios. Tus datos no se han tocado.'}
      </p>
      <div className="flex gap-2">
        <button disabled={retrying} onClick={() => { setRetrying(true); retry(); setTimeout(() => setRetrying(false), 1500); }}
          className="flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-small font-medium text-accent-ink disabled:opacity-60">
          <RotateCw size={15} className={retrying ? 'animate-spin' : ''} /> Reintentar
        </button>
        <Link href="/" className="rounded-control bg-surface-2 px-4 py-2.5 text-small font-medium">Ir a Inicio</Link>
      </div>
      {error.digest && <p className="text-small text-muted">Código: {error.digest}</p>}
    </div>
  );
}
