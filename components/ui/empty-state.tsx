import Link from 'next/link';
import { Mascot } from '@/components/advisor/mascot';
import { buttonClass } from './button';

/** Qué hacer cuando una pantalla aún no tiene datos, en vez de gráficos a cero: Duro lo cuenta y da el primer paso. */
export function EmptyState({ title, body, actions }: { title: string; body: string; actions: { href: string; label: string }[] }) {
  return (
    <div className="flex animate-rise flex-col items-start gap-2 rounded-card border border-line bg-surface p-5">
      <Mascot size={48} alive />
      <h2 className="mt-1 text-heading">{title}</h2>
      <p className="text-muted">{body}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <Link key={a.href} href={a.href}
            className={buttonClass(i === 0 ? 'primary' : 'secondary', 'sm')}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Lo mismo cuando el primer paso no es un enlace (el botón ya está en la pantalla): Duro y una frase. */
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex animate-rise flex-col items-center gap-3 py-12 text-center">
      <Mascot size={56} alive />
      <p className="max-w-64 text-muted">{children}</p>
    </div>
  );
}
