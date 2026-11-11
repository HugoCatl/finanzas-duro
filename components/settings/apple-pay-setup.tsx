'use client';

import { useState, useTransition } from 'react';
import { Copy } from 'lucide-react';
import { createShortcutToken, revokeShortcutToken } from '@/lib/actions/shortcut';
import { useOnline } from '@/lib/hooks/use-online';
import { PrimaryButton } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';

/** Token y pasos para que un atajo de iOS apunte solo cada pago con Apple Pay. */
export function ApplePaySetup({ enabled }: { enabled: boolean }) {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const url = open ? `${window.location.origin}/api/apple-pay` : ''; // solo en el cliente, con la hoja abierta

  function generate() {
    if (enabled && !token && !confirm('Se creará un token nuevo y el atajo que ya tienes dejará de funcionar hasta que lo cambies. ¿Seguir?')) return;
    setError(null);
    start(async () => {
      const r = await createShortcutToken();
      if (r.ok) setToken(r.token);
      else setError(r.error);
    });
  }

  function revoke() {
    if (!confirm('¿Desactivar? El atajo dejará de apuntar gastos.')) return;
    start(async () => {
      await revokeShortcutToken();
      setToken(null);
      toast('Apple Pay desactivado');
    });
  }

  const copy = (value: string, what: string) => navigator.clipboard.writeText(value).then(() => toast(`${what} copiado`), () => setError('No se pudo copiar'));
  const copyRow = (label: string, value: string) => (
    <button type="button" onClick={() => copy(value, label)} className="flex w-full items-center gap-3 rounded-control bg-surface-2 px-4 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-small text-muted">{label}</span>
        <span className="block truncate font-mono text-small">{value}</span>
      </span>
      <Copy size={16} className="shrink-0 text-muted" />
    </button>
  );

  return (
    <>
      <p className="mb-3 text-small text-muted">
        Cada vez que pagues con el iPhone o el reloj, el gasto se apunta solo, con la cuenta de esa tarjeta y la categoría que sueles usar en ese comercio.
      </p>
      <button onClick={() => setOpen(true)} className="w-full rounded-control bg-surface-2 px-4 py-3 text-left text-small">
        {enabled ? 'Activado · ver instrucciones o cambiar token' : 'Configurar con Atajos'}
      </button>

      <Sheet open={open} onClose={() => { setOpen(false); setToken(null); }} title="Apple Pay automático">
        <div className="flex flex-col gap-4 text-small">
          {token ? (
            <>
              <p className="rounded-control bg-warn/15 px-4 py-3">Copia el token ahora: no se volverá a mostrar.</p>
              {copyRow('Token', token)}
            </>
          ) : (
            <PrimaryButton type="button" onClick={generate} disabled={pending || !online}>
              {pending ? 'Creando…' : enabled ? 'Crear un token nuevo' : 'Crear token'}
            </PrimaryButton>
          )}
          {copyRow('Dirección', url)}

          <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted">
            <li>Abre la app <b className="text-text">Atajos</b>, pestaña <b className="text-text">Automatización</b> (abajo) y toca <b className="text-text">+</b>. Si es tu primera automatización, toca <b className="text-text">Nueva automatización</b>.</li>
            <li>Baja hasta <b className="text-text">Transacción</b> (el icono de Cartera). Elige tus tarjetas, deja marcado <b className="text-text">Al tocar</b>, abajo elige <b className="text-text">Ejecutar inmediatamente</b> y toca <b className="text-text">Siguiente</b>.</li>
            <li>Toca <b className="text-text">Nuevo atajo en blanco</b> → <b className="text-text">Añadir acción</b>, busca <b className="text-text">URL</b> y elige <b className="text-text">Obtener contenido de URL</b>. Toca «URL» y pega la dirección de arriba.</li>
            <li>Toca la flecha <b className="text-text">›</b> de la acción. <b className="text-text">Método</b>: POST. En <b className="text-text">Cabeceras</b> toca «Añadir nueva cabecera»: clave <span className="font-mono text-text">Authorization</span>, valor <span className="font-mono text-text">Bearer </span> y el token pegado detrás (con el espacio).</li>
            <li><b className="text-text">Cuerpo de la solicitud</b>: JSON o Formulario, da igual. Añade tres campos de <b className="text-text">Texto</b>: <span className="font-mono text-text">amount</span>, <span className="font-mono text-text">merchant</span> y <span className="font-mono text-text">card</span>. En cada valor mantén pulsado → <b className="text-text">Seleccionar variable</b> → <b className="text-text">Entrada del atajo</b>, tócala otra vez y elige <b className="text-text">Importe</b>, <b className="text-text">Comercio</b> y <b className="text-text">Nombre</b> (o Tarjeta) respectivamente.</li>
            <li>Toca <b className="text-text">OK</b> y paga algo con Apple Pay: te llegará una notificación con lo apuntado.</li>
          </ol>
          <p className="text-small text-muted">Para saber la cuenta, el nombre de la tarjeta en Wallet tiene que contener el de la cuenta (p. ej. «Revolut» en «Revolut Mastercard»).</p>

          {error && <p role="alert" className="text-loss">{error}</p>}
          {enabled && <button type="button" onClick={revoke} disabled={pending || !online} className="text-loss disabled:opacity-40">Desactivar</button>}
        </div>
      </Sheet>
    </>
  );
}
