'use client';

import { useState } from 'react';
import { hasProfile, type Profile } from '@/lib/profile';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toaster';
import { ProfileEditor } from './profile-form';

/** Ajustes: lo que sabe Duro de ti. */
export function ProfileCard({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-control bg-surface-2 px-4 py-3 text-left text-small">
        {hasProfile(profile) ? `${profile.age} años · ver o cambiar` : 'Cuéntale a Duro sobre ti para que te aconseje a medida'}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Sobre ti">
        {open && <ProfileEditor initial={profile} onSaved={(p) => { setProfile(p); setOpen(false); toast('Perfil guardado'); }} />}
      </Sheet>
    </>
  );
}
