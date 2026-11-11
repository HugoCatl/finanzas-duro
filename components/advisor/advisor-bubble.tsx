'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronRight, Globe, RotateCcw, UserRound, X } from 'lucide-react';
import { duro, useDuro } from '@/lib/duro/store';
import { Sheet } from '@/components/ui/sheet';
import { getProfile } from '@/lib/actions/profile';
import { hasProfile, type Profile } from '@/lib/profile';
import { ADVISOR_MAX_CHARS, splitAnswer, type ChatMessage } from '@/lib/ai/advisor';
import { useOnline } from '@/lib/hooks/use-online';
import { Mascot } from './mascot';
import { ProfileEditor } from './profile-form';
import { DURO_ASK_EVENT } from './ask-duro';

const STORE = 'finanzas:asesor';
const SUGGESTIONS = ['¿Cómo voy este mes?', '¿Qué ha pasado hoy con mis inversiones?', '¿En qué gasto de más?', '¿Cuánto colchón debería tener?'];

function load(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '[]') as ChatMessage[]; } catch { return []; }
}
function store(msgs: ChatMessage[]) {
  try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))); } catch {}
}

/** **negrita** y saltos de línea, sin interpretar HTML. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>)}</>;
}

const SLEEP_AFTER_MS = 45_000;

/** Solo en desarrollo: botones para ver cada ánimo de Duro sin esperar a que pase. */
function DevMoods() {
  const btn = 'rounded-full bg-surface-2 px-2 py-0.5 text-[11px]';
  return (
    <div className="absolute bottom-0 left-full ml-2 flex w-max gap-1">
      <button type="button" className={btn} onClick={() => duro.react('celebrating', '¡Objetivo cumplido! 🎉')}>Celebrar</button>
      <button type="button" className={btn} onClick={() => duro.react('worried', '¡Cuidado con ese gasto!')}>Alerta</button>
      <button type="button" className={btn} onClick={() => duro.set(duro.get().base === 'thinking' ? 'idle' : 'thinking')}>Pensar</button>
      <button type="button" className={btn} onClick={() => duro.set(duro.get().base === 'talking' ? 'idle' : 'talking')}>Hablar</button>
      <button type="button" className={btn} onClick={() => duro.set('sleeping')}>Dormir</button>
    </div>
  );
}

/** Bolita flotante con Duro: abre un chat corto sobre tus finanzas. Duro reacciona a lo que pasa (lib/duro/store). */
export function AdvisorBubble() {
  const online = useOnline();
  const { message } = useDuro();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const [tucked, setTucked] = useState(false);

  // Al bajar por la página Duro se aparta para no tapar lo que lees; al subir, vuelve.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 12) return;
      setTucked(y > last && y > 120);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Si nadie toca nada en un rato, Duro se duerme; al volver, se despierta con un guiño.
  const chatOpen = useRef(false);
  chatOpen.current = open;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let asleepSince = 0;
    const sleep = () => { if (!chatOpen.current && duro.get().mood === 'idle') duro.set('sleeping'); };
    const wake = (e: Event) => {
      clearTimeout(timer);
      timer = setTimeout(sleep, SLEEP_AFTER_MS);
      if (duro.get().base !== 'sleeping') { asleepSince = 0; return; }
      asleepSince ||= Date.now();
      // Un roce del ratón justo al dormirse no lo despierta: hace falta moverse un poco después.
      if (e.type === 'pointermove' && Date.now() - asleepSince < 1500) return;
      asleepSince = 0;
      duro.set('idle');
      duro.react('wink');
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'pointermove'] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    timer = setTimeout(sleep, SLEEP_AFTER_MS);
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, wake)); };
  }, []);

  function openChat() {
    duro.hush();
    duro.react('wink');
    setMessages(load());
    setOpen(true);
    if (!profile) getProfile().then(setProfile).catch(() => null);
  }

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, busy]);

  async function send(question: string, history: ChatMessage[] = messages) {
    const q = question.trim().slice(0, ADVISOR_MAX_CHARS);
    if (!q || busy) return;
    const next: ChatMessage[] = [...history, { role: 'user', content: q }];
    setMessages(next);
    setText('');
    setError(null);
    setBusy(true);
    duro.set('thinking');
    let answer = '';
    try {
      const res = await fetch('/api/asesor', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) throw new Error(res.status === 429 || res.status === 400 ? await res.text() : '');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const partial = splitAnswer(answer);
        if (partial.content.trim()) duro.set('talking');
        setMessages([...next, { role: 'assistant', ...partial }]);
      }
      const reply = splitAnswer(answer);
      if (!reply.content.trim()) throw new Error('');
      store([...next, { role: 'assistant', ...reply }]);
      duro.set('idle');
    } catch (e) {
      setMessages(next.slice(0, -1));
      setText(q);
      setError((e instanceof Error && e.message) || 'No he podido contestar. Inténtalo en un rato.');
      duro.set('idle');
      duro.react('worried');
    } finally {
      setBusy(false);
    }
  }

  // Preguntas que llegan de fuera del chat (el botón de una inversión o un aviso).
  const ask = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    ask.current = (q) => {
      const history = load();
      setEditing(false);
      setOpen(true);
      if (!profile) getProfile().then(setProfile).catch(() => null);
      void send(q, history);
    };
  });
  useEffect(() => {
    const onAsk = (e: Event) => ask.current((e as CustomEvent<string>).detail);
    window.addEventListener(DURO_ASK_EVENT, onAsk);
    return () => window.removeEventListener(DURO_ASK_EVENT, onAsk);
  }, []);

  function reset() {
    setMessages([]);
    store([]);
    setError(null);
  }

  return (
    <>
      <div className={`fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] left-5 z-30 transition duration-300 lg:bottom-10 lg:left-[17.5rem] lg:translate-x-0 lg:opacity-100 ${tucked && !message ? '-translate-x-24 opacity-0' : ''}`}>
        {message && (
          <div role="status" className="absolute bottom-full left-1 mb-2 flex w-max max-w-60 animate-rise items-start gap-1 rounded-card rounded-bl-md border border-line bg-surface py-2 pl-3.5 pr-1.5 text-small shadow-lg">
            <button type="button" onClick={openChat} className="text-left">{message}</button>
            <button type="button" onClick={() => duro.hush()} aria-label="Cerrar" className="-mt-0.5 grid size-6 shrink-0 place-items-center text-muted"><X size={14} /></button>
          </div>
        )}
        <button type="button" data-tour="duro" onClick={openChat} aria-label="Hablar con Duro, tu asesor"
          className="grid size-14 place-items-center drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)] transition duration-300 hover:scale-105 active:scale-95">
          <Mascot size={56} live track />
        </button>
        {process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_DEMO && <DevMoods />}
      </div>

      <Sheet open={open} onClose={() => { setOpen(false); setEditing(false); }} title={editing ? 'Sobre ti' : 'Duro · tu asesor'}>
        {editing && profile ? (
          <ProfileEditor initial={profile} onSaved={(p) => { setProfile(p); setEditing(false); }} />
        ) : (
          <div className="flex flex-col gap-4">
            {profile && !hasProfile(profile) && (
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-3 rounded-control bg-surface-2 px-4 py-3 text-left text-small">
                <UserRound size={18} className="shrink-0 text-muted" />
                <span><b>Cuéntame un poco sobre ti</b><br /><span className="text-muted">Edad, planes y riesgo: así te aconsejo a tu medida.</span></span>
              </button>
            )}

            <div className="flex min-h-40 flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex gap-2.5">
                  <Mascot size={32} live />
                  <p className="rounded-control rounded-tl-md border-l-2 border-duro bg-surface-2 px-3.5 py-2.5 text-small">
                    ¡Hola! Soy <b>Duro</b>. Veo tus cuentas, gastos e inversiones, y puedo buscar noticias de los mercados. Pregúntame lo que quieras sobre tu dinero.
                  </p>
                </div>
              )}
              {messages.map((m, i) => m.role === 'user' ? (
                <p key={i} className="ml-10 self-end whitespace-pre-wrap rounded-control rounded-tr-md bg-accent px-3.5 py-2.5 text-small text-accent-ink">{m.content}</p>
              ) : (
                <div key={i} className="flex items-start gap-2.5">
                  <Mascot size={32} live={busy && i === messages.length - 1} />
                  <div className="mr-4 min-w-0">
                    <p className="whitespace-pre-wrap rounded-control rounded-tl-md border-l-2 border-duro bg-surface-2 px-3.5 py-2.5 text-small"><Rich text={m.content} /></p>
                    {m.cards?.map((c) => (
                      <Link key={c.href + c.title} href={c.href} onClick={() => setOpen(false)}
                        className="mt-2 flex items-center gap-3 rounded-control border border-line px-3.5 py-3 active:scale-[0.99]">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] text-muted">{c.title}</span>
                          <span className="num block truncate font-medium">{c.value}</span>
                          {c.pct !== undefined && (
                            <span className="my-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${c.pct * 100}%` }} />
                            </span>
                          )}
                          <span className="num block truncate text-[11px] text-muted">{c.detail}</span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-muted" />
                      </Link>
                    ))}
                    {!!m.sources?.length && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <Globe size={12} aria-hidden /> <span className="sr-only">Fuentes:</span>
                        {m.sources.map((s) => (
                          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-surface-2 px-2 py-0.5 underline-offset-2 hover:underline">{s.title}</a>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {busy && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex items-center gap-2.5 text-small text-muted"><Mascot size={32} thinking /> Pensando…</div>
              )}
              <div ref={end} />
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={!online || busy} onClick={() => send(s)}
                    className="rounded-full bg-surface-2 px-3 py-1.5 text-small disabled:opacity-40">{s}</button>
                ))}
              </div>
            )}

            {error && <p role="alert" className="text-small text-loss">{error}</p>}

            <form className="sticky bottom-0 flex items-end gap-2 bg-surface pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
              <textarea rows={1} value={text} maxLength={ADVISOR_MAX_CHARS} placeholder={online ? 'Pregúntale a Duro…' : 'Sin conexión'}
                disabled={!online} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-control border border-line bg-surface-2 px-4 py-2.5 outline-none focus:border-accent" />
              <button type="submit" aria-label="Enviar" disabled={!text.trim() || busy || !online}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-30"><ArrowUp size={18} /></button>
            </form>

            <div className="flex justify-between text-small text-muted">
              <button type="button" onClick={() => profile && setEditing(true)} className="underline-offset-2 hover:underline">Editar sobre ti</button>
              {messages.length > 0 && <button type="button" onClick={reset} className="flex items-center gap-1"><RotateCcw size={12} /> Empezar de nuevo</button>}
            </div>
            <p className="text-center text-[11px] leading-snug text-muted">Orientación general, no asesoramiento financiero regulado.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
