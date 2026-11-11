/**
 * Tarjeta plana: casi del negro del fondo, borde fino y sin sombra. `flush` sin relleno, para listas.
 * Si `className` ya trae su propio relleno (p-0, px-5…), no se añade el de por defecto.
 */
export function Card({ className = '', flush = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  const pad = flush || /(^|\s)p[xytrbl]?-/.test(className) ? '' : 'p-4';
  return <div className={`rounded-card border border-line bg-surface ${pad} ${className}`} {...props} />;
}
