-- Atajo de iOS que apunta los pagos de Wallet: un token por usuario, guardado solo como hash.
alter table public.settings add column if not exists shortcut_token_hash text unique;
