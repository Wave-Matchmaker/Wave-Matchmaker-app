-- Wave Matchmaker waitlist table — run this in the Supabase SQL Editor once.
-- Anon key can insert emails but cannot read/update/delete them: RLS is on,
-- there is only an INSERT policy, and anon's table grants are insert-only.

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Make the insert-only behavior explicit instead of relying on Supabase's
-- default grants for new public tables (which would otherwise allow anon to
-- attempt SELECT/UPDATE/DELETE, blocked only by the missing policies).
grant insert on public.waitlist to anon;
revoke select, update, delete on public.waitlist from anon;

-- RLS is deliberately not forced: the table owner (postgres) still bypasses
-- it so signups can be inspected in the Table Editor / SQL editor.

drop policy if exists "anon can insert waitlist" on public.waitlist;
create policy "anon can insert waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);
