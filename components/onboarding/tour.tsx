'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

export const TOUR_DONE_KEY = 'finanzas:tour-done';

const STEPS: { tour: string; title: string; description: string }[] = [
  { tour: 'networth', title: 'Tu patrimonio', description: 'Todo lo que tienes sumado: cuentas e inversiones. Debajo, cuánto ha cambiado hoy, este mes y este año.' },
  { tour: 'investments', title: 'Tus inversiones', description: 'El precio se actualiza solo. Ves cuánto valen, cómo van hoy y cuánto ganas desde que entraste.' },
  { tour: 'month', title: 'Tu mes', description: 'Cuánto te queda del presupuesto y en qué categorías se va más dinero.' },
  { tour: 'activity', title: 'Lo que viene y lo último', description: 'Tus próximos fijos (nómina, recibos, traspasos) y los últimos movimientos.' },
  { tour: 'goal', title: 'Tu objetivo', description: 'Cuánto te falta y, a tu ritmo de ahorro, cuándo llegarías.' },
  { tour: 'add', title: 'Apunta un gasto', description: 'Con este botón apuntas gastos, ingresos o traspasos. Te pregunta de qué cuenta sale y lo resta de ahí.' },
  { tour: 'privacy', title: 'Modo privado', description: 'Toca el ojo para tapar todas las cifras cuando uses la app delante de otros. Vuelve a tocarlo para verlas.' },
  { tour: 'nav-movimientos', title: 'Movimientos', description: 'Todo lo que entra y sale, por días. Desliza una fila para editarla o borrarla, y tira hacia abajo para refrescar.' },
  { tour: 'nav-inversiones', title: 'Inversiones', description: 'Lo que valen tus fondos, acciones y cripto, en vivo: cuánto se ha movido hoy, tus planes automáticos y lo que te pagan de intereses.' },
  { tour: 'nav-analisis', title: 'Análisis', description: 'Cómo evoluciona tu patrimonio, tus gastos frente al mes anterior, una proyección a futuro y un resumen del mes hecho con IA.' },
  { tour: 'nav-mas', title: 'Más apartados', description: 'Cuentas (saldos y TAE de cada banco), Presupuesto (límites y fijos), Automático (traspasos, planes e intereses que pasan solos) y Ajustes, donde puedes repetir este tutorial.' },
  { tour: 'duro', title: 'Duro, tu asesor', description: 'Este cerdito conoce tus números. Pregúntale cómo vas, en qué gastas de más o cómo empezar a invertir.' },
];

/** El elemento visible con ese data-tour (la navegación existe dos veces: móvil y escritorio). */
function visible(tour: string): Element | undefined {
  return [...document.querySelectorAll(`[data-tour="${tour}"]`)].find((el) => (el as HTMLElement).offsetParent !== null || getComputedStyle(el).position === 'fixed');
}

/** Tutorial de Inicio: sale la primera vez en cada dispositivo y cuando se pide con ?tour=1. */
export function HomeTour() {
  const params = useSearchParams();
  const router = useRouter();
  const forced = params.get('tour') === '1';

  useEffect(() => {
    let done = false;
    try { done = localStorage.getItem(TOUR_DONE_KEY) === '1'; } catch {}
    if ((done || process.env.NEXT_PUBLIC_DEMO) && !forced) return; // en el modo demo (capturas) no sale solo

    const timer = setTimeout(() => {
      const steps: DriveStep[] = STEPS.flatMap((s) => {
        const element = visible(s.tour);
        return element ? [{ element, popover: { title: s.title, description: s.description } }] : [];
      });
      if (steps.length === 0) return;
      const tour = driver({
        steps,
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        doneBtnText: 'Entendido',
        popoverClass: 'finanzas-tour',
        stageRadius: 20,
        onDestroyed: () => {
          try { localStorage.setItem(TOUR_DONE_KEY, '1'); } catch {}
          if (forced) router.replace('/', { scroll: false });
        },
      });
      tour.drive();
    }, 500);
    return () => clearTimeout(timer);
  }, [forced, router]);

  return null;
}
