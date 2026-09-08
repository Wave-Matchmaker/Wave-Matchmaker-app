-- Wave Matchmaker waitlist table — run this in the Supabase SQL Editor once.
-- Anon key can insert emails but cannot read/update/delete them (no SELECT policy).

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anon can insert waitlist" on public.waitlist;
create policy "anon can insert waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);
