'use client';

import { useState, useTransition } from 'react';
import { EXPERIENCE, GOALS, HORIZON, HOUSING, RISK, SITUATIONS, type Profile } from '@/lib/profile';
import { saveProfile } from '@/lib/actions/profile';
import { Field, inputClass, PrimaryButton } from '@/components/ui/field';

const chip = (on: boolean) => `rounded-full border px-3.5 py-2 text-small transition ${on ? 'border-accent bg-accent text-accent-ink' : 'border-transparent bg-surface-2 text-muted'}`;

function Choice<T extends string>({ label, options, value, onChange }: {
  label: string; options: Record<T, string>; value: T | null; onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-small text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(options) as [T, string][]).map(([k, text]) => (
          <button type="button" key={k} className={chip(value === k)} onClick={() => onChange(value === k ? null : k)}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/** Preguntas sobre ti: edad, situación, objetivos y cómo llevas el riesgo. */
export function ProfileFields({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = (patch: Partial<Profile>) => onChange({ ...value, ...patch });
  const num = (s: string) => (s.trim() === '' ? null : Number.isInteger(Number(s)) ? Number(s) : null);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Edad">
          <input className={`${inputClass} num`} inputMode="numeric" placeholder="Años" value={value.age ?? ''}
            onChange={(e) => set({ age: num(e.target.value.replace(/\D/g, '').slice(0, 3)) })} />
        </Field>
        <Field label="Personas a tu cargo">
          <input className={`${inputClass} num`} inputMode="numeric" placeholder="0" value={value.dependents ?? ''}
            onChange={(e) => set({ dependents: num(e.target.value.replace(/\D/g, '').slice(0, 2)) })} />
        </Field>
      </div>
      <Choice label="¿A qué te dedicas?" options={SITUATIONS} value={value.situation} onChange={(situation) => set({ situation })} />
      <Choice label="¿Dónde vives?" options={HOUSING} value={value.housing} onChange={(housing) => set({ housing })} />
      <div className="flex flex-col gap-2">
        <span className="text-small text-muted">¿Qué quieres conseguir? (varias)</span>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(GOALS) as [keyof typeof GOALS, string][]).map(([k, text]) => {
            const on = value.goals.includes(k);
            return <button type="button" key={k} className={chip(on)} onClick={() => set({ goals: on ? value.goals.filter((g) => g !== k) : [...value.goals, k] })}>{text}</button>;
          })}
        </div>
      </div>
      <Choice label="Si tus inversiones caen un 20 %…" options={RISK} value={value.risk} onChange={(risk) => set({ risk })} />
      <Choice label="¿Para cuándo es ese dinero?" options={HORIZON} value={value.horizon} onChange={(horizon) => set({ horizon })} />
      <Choice label="Invirtiendo…" options={EXPERIENCE} value={value.experience} onChange={(experience) => set({ experience })} />
      <Choice label="¿Tienes préstamos o deudas de tarjeta?" options={{ yes: 'Sí', no: 'No' }}
        value={value.debts === null ? null : value.debts ? 'yes' : 'no'} onChange={(v) => set({ debts: v === null ? null : v === 'yes' })} />
      <Field label="Algo más que deba saber (opcional)">
        <textarea className={`${inputClass} min-h-20 resize-none`} maxLength={300} value={value.notes}
          placeholder="Ej.: quiero dar la entrada de un piso en 3 años" onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

/** Perfil con botón de guardar, para Ajustes y el asesor. */
export function ProfileEditor({ initial, onSaved }: { initial: Profile; onSaved?: (p: Profile) => void }) {
  const [profile, setProfile] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => {
      e.preventDefault();
      setError(null);
      start(async () => {
        const r = await saveProfile(profile);
        if (r.ok) onSaved?.(profile);
        else setError(r.error);
      });
    }}>
      <ProfileFields value={profile} onChange={setProfile} />
      {error && <p role="alert" className="text-small text-loss">{error}</p>}
      <PrimaryButton disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</PrimaryButton>
    </form>
  );
}
