-- Perfil del usuario para el asesor y contador diario de mensajes (límite de gasto en IA).
alter table public.settings
  add column if not exists profile jsonb,
  add column if not exists advisor_day date,
  add column if not exists advisor_count integer not null default 0;
