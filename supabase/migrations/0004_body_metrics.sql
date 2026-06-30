-- ============================================================================
-- Migration 0004 — Body metrics + realtime publication
-- Run after 0003. Apply in the Supabase SQL editor or via the CLI.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- body_metrics: one entry per user per day (upserted by date).
-- ----------------------------------------------------------------------------
create table if not exists public.body_metrics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null default current_date,
  weight     numeric(6, 2) check (weight is null or weight >= 0),
  body_fat   numeric(5, 2) check (body_fat is null or (body_fat >= 0 and body_fat <= 100)),
  chest      numeric(6, 2) check (chest is null or chest >= 0),
  waist      numeric(6, 2) check (waist is null or waist >= 0),
  arms       numeric(6, 2) check (arms is null or arms >= 0),
  thighs     numeric(6, 2) check (thighs is null or thighs >= 0),
  calories   integer check (calories is null or calories >= 0),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date desc);

drop trigger if exists body_metrics_set_updated_at on public.body_metrics;
create trigger body_metrics_set_updated_at
  before update on public.body_metrics
  for each row execute function public.set_updated_at();

-- RLS: owner-only.
alter table public.body_metrics enable row level security;

drop policy if exists "Select own body_metrics" on public.body_metrics;
create policy "Select own body_metrics" on public.body_metrics
  for select using (auth.uid() = user_id);
drop policy if exists "Insert own body_metrics" on public.body_metrics;
create policy "Insert own body_metrics" on public.body_metrics
  for insert with check (auth.uid() = user_id);
drop policy if exists "Update own body_metrics" on public.body_metrics;
create policy "Update own body_metrics" on public.body_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Delete own body_metrics" on public.body_metrics;
create policy "Delete own body_metrics" on public.body_metrics
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Realtime: add tables to the supabase_realtime publication (idempotent).
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.workouts;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.body_metrics;
exception when others then null;
end $$;
