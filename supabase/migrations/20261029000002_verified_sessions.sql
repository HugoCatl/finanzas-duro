-- Sesiones que han superado la frase de acceso. Solo el service role lee/escribe esta tabla.
create table public.verified_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index verified_sessions_user_idx on public.verified_sessions (user_id);
alter table public.verified_sessions enable row level security; -- sin políticas: anon/authenticated no acceden

-- true si la sesión del JWT actual está verificada y no ha caducado. Claim ausente/inválido → false.
create or replace function public.session_verified() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.verified_sessions v
    where v.session_id = case
            when (select auth.jwt() ->> 'session_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then ((select auth.jwt() ->> 'session_id'))::uuid
          end
      and v.user_id = (select auth.uid())
      and v.expires_at > now()
  );
$$;
revoke execute on function public.session_verified() from public, anon;
grant execute on function public.session_verified() to authenticated;

-- Política restrictiva: además de "own rows", la sesión debe estar verificada.
do $$
declare t text;
begin
  foreach t in array array['settings','accounts','holdings','holding_events','categories','recurring',
    'transactions','monthly_goals','snapshots','alerts','push_subscriptions','ai_summaries']
  loop
    execute format(
      'create policy "second factor" on public.%I as restrictive for all to authenticated
         using ((select public.session_verified())) with check ((select public.session_verified()))', t);
  end loop;
end $$;
