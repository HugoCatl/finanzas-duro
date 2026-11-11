-- Traspasos entre cuentas, cuenta por defecto de cada categoría y planes de inversión

-- Traspaso: movimiento con importe negativo en la cuenta de origen y la de destino aquí. No es gasto ni ingreso.
alter table public.transactions add column if not exists transfer_account_id uuid references public.accounts on delete cascade;
alter table public.transactions add constraint transactions_transfer_check check (
  transfer_account_id is null or (account_id is not null and account_id <> transfer_account_id and amount < 0 and category_id is null)
);

alter table public.categories add column if not exists default_account_id uuid references public.accounts on delete set null;

-- Fijos de traspaso (transfer_account_id) y planes de inversión (holding_id): importe negativo = dinero que sale.
alter table public.recurring add column if not exists transfer_account_id uuid references public.accounts on delete cascade;
alter table public.recurring add column if not exists holding_id uuid references public.holdings on delete cascade;
alter table public.recurring add constraint recurring_kind_check check (
  (transfer_account_id is null or holding_id is null) and ((transfer_account_id is null and holding_id is null) or amount < 0)
);

-- Compra creada por un plan: el importador la sustituye por la real y el cron no la repite en el mes.
alter table public.holding_events add column if not exists recurring_id uuid references public.recurring on delete set null;
create unique index if not exists holding_events_recurring_date_uniq on public.holding_events (recurring_id, date) where recurring_id is not null;
