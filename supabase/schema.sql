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

create table if not exists public.event_email_notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  reminder_days int not null,
  sent_at timestamptz not null default now(),
  unique (event_id, target_date, reminder_days)
);

create index if not exists event_email_notifications_user_idx
  on public.event_email_notifications(user_id, sent_at desc);

-- ─── Shortened share links ────────────────────────────────────────────────────

create table if not exists public.event_shares (
  id text primary key,               -- 7-char random slug
  event_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.event_shares enable row level security;

drop policy if exists "Anyone can read event shares" on public.event_shares;
create policy "Anyone can read event shares"
  on public.event_shares for select using (true);

drop policy if exists "Anyone can create event shares" on public.event_shares;
create policy "Anyone can create event shares"
  on public.event_shares for insert with check (true);

alter table public.events enable row level security;
alter table public.event_email_notifications enable row level security;

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

drop policy if exists "Users can read own email notification log" on public.event_email_notifications;
create policy "Users can read own email notification log"
  on public.event_email_notifications
  for select
  using (auth.uid() = user_id);
