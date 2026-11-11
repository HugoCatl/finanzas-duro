'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, BarChart3, Home, Menu, PieChart, Repeat, Settings, TrendingUp, Wallet, X } from 'lucide-react';

/** Lo que se usa a diario: va en la barra de abajo del móvil. */
const MAIN = [
  { href: '/', label: 'Inicio', icon: Home, tour: undefined },
  { href: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight, tour: 'nav-movimientos' },
  { href: '/inversiones', label: 'Inversiones', icon: TrendingUp, tour: 'nav-inversiones' },
  { href: '/analisis', label: 'Análisis', icon: BarChart3, tour: 'nav-analisis' },
];
/** El resto: en el móvil, dentro del panel lateral. */
const MORE = [
  { href: '/cuentas', label: 'Cuentas', icon: Wallet },
  { href: '/presupuesto', label: 'Presupuesto', icon: PieChart },
  { href: '/automatico', label: 'Automático', icon: Repeat },
];

function Brand() {
  return (
    <p className="flex items-center gap-2.5 px-3 font-semibold tracking-tight">
      <Image src="/duro.png" alt="" width={30} height={30} /> Finanzas
    </p>
  );
}

export function AppNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const moreActive = [...MORE, { href: '/ajustes' }].some((i) => isActive(i.href));

  // Al cambiar de pantalla, el panel se cierra.
  const [shownPath, setShownPath] = useState(path);
  if (shownPath !== path) { setShownPath(path); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.documentElement.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <nav data-tour="nav" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-lg lg:hidden">
        <ul className="mx-auto flex max-w-md justify-around">
          {MAIN.map(({ href, label, icon: Icon, tour }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link href={href} data-tour={tour} aria-current={active ? 'page' : undefined}
                  className={`flex w-[68px] flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] ${active ? 'font-medium text-accent' : 'text-faint'}`}>
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" data-tour="nav-mas" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="menu-lateral"
              className={`flex w-[68px] flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] ${moreActive ? 'font-medium text-accent' : 'text-faint'}`}>
              <Menu size={22} strokeWidth={moreActive ? 2.2 : 1.6} />
              Más
            </button>
          </li>
        </ul>
      </nav>

      {/* Panel lateral del móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside id="menu-lateral" role="dialog" aria-modal="true" aria-label="Menú"
          className={`pt-safe absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-1 bg-surface px-3 pb-8 shadow-xl transition-transform duration-300 ease-soft ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-4 mt-4 flex items-center justify-between">
            <Brand />
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="grid size-9 place-items-center rounded-full text-muted">
              <X size={20} />
            </button>
          </div>
          {[...MAIN, ...MORE].map(({ href, label, icon: Icon }) => (
            <DrawerLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} tabIndex={open ? 0 : -1} />
          ))}
          <div className="mt-auto">
            <DrawerLink href="/ajustes" label="Ajustes" icon={Settings} active={isActive('/ajustes')} tabIndex={open ? 0 : -1} />
          </div>
        </aside>
      </div>

      <aside data-tour="nav" className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-0.5 border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="mb-6"><Brand /></div>
        {MAIN.map(({ href, label, icon: Icon, tour }) => (
          <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} tour={tour} />
        ))}
        <div data-tour="nav-mas" className="flex flex-col gap-0.5">
          {MORE.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
          ))}
        </div>
        <div className="mt-auto">
          <NavLink href="/ajustes" label="Ajustes" icon={Settings} active={isActive('/ajustes')} />
        </div>
      </aside>
    </>
  );
}

function DrawerLink({ href, label, icon: Icon, active, tabIndex }: { href: string; label: string; icon: typeof Home; active: boolean; tabIndex: number }) {
  return (
    <Link href={href} tabIndex={tabIndex} aria-current={active ? 'page' : undefined}
      className={`flex h-12 items-center gap-3 rounded-control px-3 ${active ? 'bg-surface-2 font-medium text-text' : 'text-muted'}`}>
      <Icon size={20} strokeWidth={1.8} className={active ? 'text-accent' : ''} /> {label}
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, active, tour }: { href: string; label: string; icon: typeof Home; active: boolean; tour?: string }) {
  return (
    <Link href={href} data-tour={tour} aria-current={active ? 'page' : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-lg px-3 text-small ${active ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'}`}>
      <Icon size={16} strokeWidth={1.6} className={active ? 'text-accent' : ''} /> {label}
    </Link>
  );
}
