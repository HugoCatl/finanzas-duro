'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useDuro, type DuroMood } from '@/lib/duro/store';

/** Las cuatro caras de Duro (public/duro). Cada ánimo enseña una y la anima con CSS (`.duro` en globals.css). */
type Face = 'happy' | 'calm' | 'grin' | 'wink';
const FACES: Face[] = ['happy', 'calm', 'grin', 'wink'];
const FACE_OF: Record<DuroMood, Face> = {
  idle: 'happy', talking: 'happy', worried: 'happy', thinking: 'calm', sleeping: 'calm', celebrating: 'grin', wink: 'wink',
};
/** Ánimos con vídeo hecho con IA (duro-video/, verde quitado). El resto se anima con CSS sobre la cara fija. */
const ANIMATED = new Set<DuroMood>(['idle', 'talking', 'thinking', 'celebrating']);

/**
 * Duro, el cerdito banquero. Sin props está quieto (una sola imagen). Con `alive` respira y parpadea;
 * `thinking` o `mood` fijan un ánimo; `live` sigue el ánimo compartido de la app (lib/duro/store) y
 * `track` gira la cabeza hacia el puntero.
 */
export function Mascot({ size = 40, thinking = false, alive = false, mood, live = false, track = false }: {
  size?: number; thinking?: boolean; alive?: boolean; mood?: DuroMood; live?: boolean; track?: boolean;
}) {
  const shared = useDuro().mood;
  const current: DuroMood | 'still' = mood ?? (thinking ? 'thinking' : live ? shared : alive ? 'idle' : 'still');
  const look = useLook(track);
  const gesture = useGesture(current === 'idle');
  const [ready, setReady] = useState<string | null>(null);

  if (current === 'still') {
    return (
      <span className="duro" data-mood="still" style={{ width: size, height: size }} aria-hidden>
        <Image src="/duro/happy.png" alt="" width={size} height={size} className="size-full object-contain" />
      </span>
    );
  }
  const face = FACE_OF[current];
  // Capa base: en reposo, el primer fotograma del gesto (así empezar y acabar el gesto no se nota);
  // hablando, pensando o celebrando, su vídeo en bucle. Encima, en reposo, el gesto de vez en cuando.
  const base = current === 'idle' ? '/duro/anim/idle-still.webp' : ANIMATED.has(current) ? `/duro/anim/${current}.webp` : null;
  return (
    <span className="duro" data-mood={current} data-anim={(base && ready === base) || undefined} style={{ width: size, height: size }} aria-hidden>
      <span ref={look} className="duro-look">
        <span className="duro-body">
          {FACES.map((f) => (
            <Image key={f} src={`/duro/${f}.png`} alt="" width={size} height={size} data-face={f} data-on={f === face || undefined}
              className="duro-face" />
          ))}
          {/* Vídeo animado (public/duro/anim): tapa la cara fija en cuanto ha cargado. */}
          {base && (
            <Image key={base} src={base} alt="" unoptimized width={size} height={size}
              onLoad={() => setReady(base)} data-on={ready === base || undefined} className="duro-anim" />
          )}
          {base && ready === base && gesture && <Clip key={gesture} src={gesture} size={size} />}
        </span>
      </span>
      {current === 'thinking' && <span className="duro-coin" />}
      {current === 'celebrating' && <><span className="duro-spark duro-spark-1" /><span className="duro-spark duro-spark-2" /><span className="duro-spark duro-spark-3" /></>}
      {current === 'worried' && <span className="duro-sweat" />}
      {current === 'sleeping' && <span className="duro-z" style={{ fontSize: Math.max(10, Math.round(size * 0.3)) }}>z</span>}
    </span>
  );
}

/** El gesto de reposo, encima de su primer fotograma: aparece de golpe (es idéntico a lo que tapa). */
function Clip({ src, size }: { src: string; size: number }) {
  const [on, setOn] = useState(false);
  return <Image src={src} alt="" unoptimized width={size} height={size} onLoad={() => setOn(true)} data-on={on || undefined} data-clip className="duro-anim" />;
}

/** Lo que dura idle.webp (51 fotogramas a 10 fps, suena una sola vez y acaba en el mismo fotograma con el que empieza). */
const GESTURE_MS = 5100;
let gestureBlob: Promise<Blob> | null = null;

/**
 * En reposo Duro está quieto y cada 15-30 s hace un gesto (idle.webp, una vez). Cada gesto usa una URL
 * blob nueva para que el navegador lo reproduzca desde el principio sin volver a descargarlo.
 */
function useGesture(enabled: boolean) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true;
    let url: string | null = null;
    let timer = 0;
    const stop = () => { if (url) URL.revokeObjectURL(url); url = null; };
    const later = (ms: number) => { timer = window.setTimeout(play, ms); };
    async function play() {
      if (document.hidden) return later(15000);
      try {
        gestureBlob ??= fetch('/duro/anim/idle.webp').then((r) => { if (!r.ok) throw new Error(); return r.blob(); });
        const blob = await gestureBlob;
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch { gestureBlob = null; return; }
      timer = window.setTimeout(() => { setSrc(null); stop(); later(15000 + Math.random() * 15000); }, GESTURE_MS + 200);
    }
    later(5000 + Math.random() * 10000);
    return () => { alive = false; clearTimeout(timer); stop(); setSrc(null); };
  }, [enabled]);
  return enabled ? src : null;
}

/** La cabeza mira hacia el puntero: inclinación 3D con un muelle CSS (sin animar si se pide menos movimiento). */
function useLook(enabled: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Normalizado a -1…1 respecto a la ventana: lejos del cerdo mira del todo, cerca apenas gira.
      const x = Math.max(-1, Math.min(1, (px - cx) / (window.innerWidth * 0.5)));
      const y = Math.max(-1, Math.min(1, (py - cy) / (window.innerHeight * 0.5)));
      el.style.setProperty('--look-x', x.toFixed(3));
      el.style.setProperty('--look-y', y.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const reset = () => { el.style.setProperty('--look-x', '0'); el.style.setProperty('--look-y', '0'); };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', reset);
    };
  }, [enabled]);
  return ref;
}
