-- ConvocaApp v26 - Supabase Sync semplice
-- Esegui questo in Supabase → SQL Editor → New query → Run

create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

drop policy if exists "convoca app public read" on app_state;
drop policy if exists "convoca app public insert" on app_state;
drop policy if exists "convoca app public update" on app_state;

create policy "convoca app public read"
on app_state for select
using (true);

create policy "convoca app public insert"
on app_state for insert
with check (true);

create policy "convoca app public update"
on app_state for update
using (true)
with check (true);
