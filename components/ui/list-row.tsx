import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Fila de lista: delante un icono o punto, título y subtítulo, y a la derecha la cifra. */
export function ListRow({ href, onClick, leading, title, subtitle, value, detail, chevron = !!href, muted = false }: {
  href?: string; onClick?: () => void; leading?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode;
  value?: React.ReactNode; detail?: React.ReactNode; chevron?: boolean; muted?: boolean;
}) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle && <span className="block truncate text-small text-muted">{subtitle}</span>}
      </span>
      {(value || detail) && (
        <span className="shrink-0 text-right">
          {value && <span className="num block font-medium">{value}</span>}
          {detail && <span className="block text-small">{detail}</span>}
        </span>
      )}
      {chevron && <ChevronRight size={16} className="shrink-0 text-faint" />}
    </>
  );
  const cls = `flex w-full items-center gap-3 px-4 py-3.5 text-left ${muted ? 'opacity-50' : ''}`;
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}
