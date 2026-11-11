create unique index if not exists transactions_recurring_date_uniq on public.transactions (recurring_id, date) where recurring_id is not null;
