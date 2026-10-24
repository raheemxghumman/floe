-- floe database schema. Applied once to the Supabase project; safe to re-run.
-- Every table has RLS: users only touch their own rows. Admin reads go through
-- SECURITY DEFINER functions that check is_admin() inside the database.

-- ------------------------------------------------------------------ tables

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

-- one JSON blob per user: settings, tasks, notes, local stats
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- one row per finished session, so stats survive devices and power the admin charts
create table if not exists public.focus_sessions (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null,
  minutes numeric not null check (minutes > 0 and minutes <= 600),
  type    text not null check (type in ('focus', 'short', 'long')),
  unique (user_id, at, type)
);
create index if not exists focus_sessions_user_at on public.focus_sessions (user_id, at desc);
create index if not exists focus_sessions_at on public.focus_sessions (at);

-- ----------------------------------------------------------------- helpers

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- the very first account becomes admin; everyone after is a normal user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles where role = 'admin') then 'user' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------- RLS

alter table public.profiles       enable row level security;
alter table public.user_state     enable row level security;
alter table public.focus_sessions enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- users may only change these columns on their own row (never `role`)
revoke update on public.profiles from authenticated, anon;
grant update (display_name, last_seen) on public.profiles to authenticated;

drop policy if exists "state: own" on public.user_state;
create policy "state: own" on public.user_state
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "sessions: read own" on public.focus_sessions;
create policy "sessions: read own" on public.focus_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "sessions: insert own" on public.focus_sessions;
create policy "sessions: insert own" on public.focus_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "sessions: delete own" on public.focus_sessions;
create policy "sessions: delete own" on public.focus_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.user_state, public.focus_sessions from anon;

-- ------------------------------------------------------------- admin RPCs

create or replace function public.admin_overview(days int default 30) returns json
language plpgsql stable security definer set search_path = '' as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  days := least(greatest(days, 7), 365);
  select json_build_object(
    'total_users',     (select count(*) from public.profiles),
    'new_users_7d',    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_users_7d', (select count(*) from public.profiles where last_seen  > now() - interval '7 days'),
    'admins',          (select count(*) from public.profiles where role = 'admin'),
    'focus_minutes',   (select coalesce(sum(minutes), 0) from public.focus_sessions where type = 'focus'),
    'focus_sessions',  (select count(*) from public.focus_sessions where type = 'focus'),
    'sessions_today',  (select count(*) from public.focus_sessions where type = 'focus' and at >= date_trunc('day', now())),
    'daily', (
      select coalesce(json_agg(row_to_json(d) order by d.day), '[]'::json) from (
        select g.day::date as day,
          (select count(*) from public.profiles p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as signups,
          (select count(*) from public.focus_sessions s where s.type = 'focus' and s.at >= g.day and s.at < g.day + interval '1 day') as sessions,
          (select coalesce(sum(s.minutes), 0) from public.focus_sessions s where s.type = 'focus' and s.at >= g.day and s.at < g.day + interval '1 day') as minutes,
          (select count(distinct s.user_id) from public.focus_sessions s where s.at >= g.day and s.at < g.day + interval '1 day') as active
        from generate_series(date_trunc('day', now()) - make_interval(days => days - 1), date_trunc('day', now()), interval '1 day') as g(day)
      ) d
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_users(search text default '', lim int default 50, off int default 0)
returns table (id uuid, email text, display_name text, role text, created_at timestamptz, last_seen timestamptz, focus_minutes numeric, sessions bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.display_name, p.role, p.created_at, p.last_seen,
      coalesce(sum(s.minutes) filter (where s.type = 'focus'), 0) as focus_minutes,
      count(s.id) filter (where s.type = 'focus') as sessions
    from public.profiles p
    left join public.focus_sessions s on s.user_id = p.id
    where search = '' or p.email ilike '%' || search || '%' or p.display_name ilike '%' || search || '%'
    group by p.id
    order by p.created_at desc
    limit least(greatest(lim, 1), 200) offset greatest(off, 0);
end;
$$;

create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if new_role not in ('user', 'admin') then raise exception 'invalid role'; end if;
  if new_role = 'user' and (select count(*) from public.profiles where role = 'admin') <= 1
     and exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'cannot remove the last admin';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

revoke execute on function public.admin_overview(int), public.admin_users(text, int, int), public.admin_set_role(uuid, text), public.is_admin() from public, anon;
grant execute on function public.admin_overview(int), public.admin_users(text, int, int), public.admin_set_role(uuid, text), public.is_admin() to authenticated;
