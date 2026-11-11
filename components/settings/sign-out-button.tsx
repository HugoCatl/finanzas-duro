'use client';

import { useTransition } from 'react';
import { signOut } from '@/lib/actions/settings';
import { disablePushOnThisDevice } from '@/lib/push/device';

export function SignOutButton() {
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      try {
        // Antes de salir, este dispositivo deja de recibir importes en la pantalla de bloqueo.
        const r = await disablePushOnThisDevice();
        if (!r.ok) console.error('No se pudo limpiar la suscripción push', r.error);
      } catch (e) {
        console.error('No se pudo limpiar la suscripción push', e); // best-effort: se cierra sesión igualmente
      }
      await signOut();
    });
  }

  return (
    <button onClick={onClick} disabled={pending} className="w-full rounded-control bg-surface-2 px-4 py-3 text-left text-small text-loss disabled:opacity-40">
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
