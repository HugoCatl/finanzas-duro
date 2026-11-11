'use client';

import { useEffect, useState, useTransition } from 'react';
import { savePushSubscription } from '@/lib/actions/settings';
import { disablePushOnThisDevice } from '@/lib/push/device';
import { urlBase64ToUint8Array } from '@/lib/push/keys';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toaster';

type State = 'loading' | 'needs-install' | 'unsupported' | 'denied' | 'off' | 'on';

const TEXT: Record<State, string> = {
  loading: 'Avisos de presupuesto y gastos altos aunque no tengas la app abierta.',
  'needs-install': 'En iPhone, primero añade la app a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.',
  unsupported: 'Este navegador no admite notificaciones.',
  denied: 'Las has bloqueado. Actívalas en Ajustes del iPhone → Notificaciones → Finanzas.',
  off: 'Avisos de presupuesto y gastos altos aunque no tengas la app abierta.',
  on: 'Avisos de presupuesto y gastos altos aunque no tengas la app abierta.',
};

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const iOS = /iPhone|iPad/.test(navigator.userAgent);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      // Detección de capacidades del navegador: solo es posible tras montar (sincroniza con APIs externas).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(iOS && !standalone ? 'needs-install' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'off'))
      .catch(() => setState('unsupported'));
  }, []);

  function enable() {
    setMessage(null);
    if (!vapidPublicKey) {
      setMessage('Faltan las claves de notificaciones (VAPID) en la configuración.');
      return;
    }
    start(async () => {
      let sub: PushSubscription | null = null;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState('denied');
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('Suscripción incompleta');
        const r = await savePushSubscription(
          { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
          /iPhone/.test(navigator.userAgent) ? 'iPhone' : 'Navegador',
        );
        if (r.ok) {
          setState('on');
          toast('Notificaciones activadas');
        } else {
          await sub.unsubscribe().catch(() => undefined); // no dejar una suscripción que el servidor no conoce
          setMessage(r.error);
        }
      } catch (e) {
        console.error('Error activando notificaciones', e);
        await sub?.unsubscribe().catch(() => undefined);
        setMessage('No se pudieron activar las notificaciones en este dispositivo.');
      }
    });
  }

  function disable() {
    setMessage(null);
    start(async () => {
      try {
        const r = await disablePushOnThisDevice();
        if (r.ok) { setState('off'); toast('Notificaciones desactivadas'); }
        else setMessage(r.error);
      } catch (e) {
        console.error('Error desactivando notificaciones', e);
        setMessage('No se pudieron desactivar las notificaciones en este dispositivo.');
      }
    });
  }

  const usable = state === 'on' || state === 'off';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">Notificaciones</p>
          <p className="text-small text-muted">{TEXT[state]}</p>
        </div>
        <Switch label="Notificaciones en este dispositivo" checked={state === 'on'} busy={pending}
          disabled={!usable} onChange={(next) => (next ? enable() : disable())} />
      </div>
      {message && <p role="status" className="animate-fade-in text-small text-loss">{message}</p>}
    </div>
  );
}
