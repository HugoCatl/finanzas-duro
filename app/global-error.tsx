'use client';

// Sustituye al layout raíz si este falla: lleva su propio <html> y estilos mínimos (no carga globals.css).
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#f2f4f7', color: '#111' }}>
        <div style={{ maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Algo ha fallado</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 16px' }}>La app no ha podido arrancar. Tus datos no se han tocado.</p>
          <button onClick={() => retry()} style={{ border: 0, borderRadius: 16, padding: '10px 16px', background: '#111', color: '#fff', fontSize: 14 }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
