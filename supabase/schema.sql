-- Daytill Supabase schema
-- Run this in Supabase SQL Editor or as a migration.

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  category text not null,
  recurring_yearly boolean not null default false,
  reminders int[] not null default '{7,1,0}',
  email_reminder text,
  created_at timestamptz not null default now()
);

create index if not exists events_user_date_idx on public.events(user_id, event_date);

alter table public.events enable row level security;

drop policy if exists "Users can read own events" on public.events;
create policy "Users can read own events"
  on public.events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.events;
create policy "Users can insert own events"
  on public.events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own events" on public.events;
create policy "Users can update own events"
  on public.events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own events" on public.events;
create policy "Users can delete own events"
  on public.events
  for delete
  using (auth.uid() = user_id);
