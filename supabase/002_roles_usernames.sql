-- 002: usernames, moderator role, suspension status, richer admin RPCs. Safe to re-run.

create extension if not exists citext with schema extensions;

alter table public.profiles add column if not exists username extensions.citext;
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'admin'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active', 'suspended'));
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,20}$');
create unique index if not exists profiles_username_key on public.profiles (username);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator') and status = 'active');
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

-- new accounts are always plain users now that an admin exists
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uname text := nullif(new.raw_user_meta_data ->> 'username', '');
begin
  insert into public.profiles (id, email, username, display_name, role)
  values (
    new.id,
    new.email,
    uname,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), uname, split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$;

drop policy if exists "profiles: read own or admin" on public.profiles;
drop policy if exists "profiles: read own or staff" on public.profiles;
create policy "profiles: read own or staff" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_staff());

-- lets the sign-up form check a username before submitting (reveals only taken / free)
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select name ~ '^[a-zA-Z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = name::extensions.citext);
$$;

drop function if exists public.admin_overview(int);
create function public.admin_overview(days int default 30) returns json
language plpgsql stable security definer set search_path = '' as $$
declare result json;
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  days := least(greatest(days, 7), 365);
  select json_build_object(
    'total_users',     (select count(*) from public.profiles),
    'new_users_7d',    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_users_7d', (select count(*) from public.profiles where last_seen  > now() - interval '7 days'),
    'active_today',    (select count(*) from public.profiles where last_seen  > now() - interval '1 day'),
    'suspended',       (select count(*) from public.profiles where status = 'suspended'),
    'roles',           (select json_object_agg(role, n) from (select role, count(*) n from public.profiles group by role) r),
    'focus_minutes',   (select coalesce(sum(minutes), 0) from public.focus_sessions where type = 'focus'),
    'break_minutes',   (select coalesce(sum(minutes), 0) from public.focus_sessions where type <> 'focus'),
    'focus_sessions',  (select count(*) from public.focus_sessions where type = 'focus'),
    'sessions_today',  (select count(*) from public.focus_sessions where type = 'focus' and at >= date_trunc('day', now())),
    'tasks_completed', (select coalesce(sum((data ->> 'tasksCompleted')::int), 0) from public.user_state where data ? 'tasksCompleted'),
    'daily', (
      select coalesce(json_agg(row_to_json(d) order by d.day), '[]'::json) from (
        select g.day::date as day,
          (select count(*) from public.profiles p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as signups,
          (select count(*) from public.focus_sessions s where s.type = 'focus' and s.at >= g.day and s.at < g.day + interval '1 day') as sessions,
          (select coalesce(sum(s.minutes), 0) from public.focus_sessions s where s.type = 'focus' and s.at >= g.day and s.at < g.day + interval '1 day') as minutes,
          (select count(distinct s.user_id) from public.focus_sessions s where s.at >= g.day and s.at < g.day + interval '1 day') as active
        from generate_series(date_trunc('day', now()) - make_interval(days => days - 1), date_trunc('day', now()), interval '1 day') as g(day)
      ) d
    ),
    'hours', (
      select coalesce(json_agg(row_to_json(h) order by h.hour), '[]'::json) from (
        select g.hour, (select count(*) from public.focus_sessions s where s.type = 'focus' and extract(hour from s.at) = g.hour and s.at > now() - make_interval(days => days)) as sessions
        from generate_series(0, 23) as g(hour)
      ) h
    )
  ) into result;
  return result;
end;
$$;

drop function if exists public.admin_users(text, int, int);
create function public.admin_users(search text default '', lim int default 100, off int default 0)
returns table (
  id uuid, email text, username text, display_name text, role text, status text,
  created_at timestamptz, last_seen timestamptz, focus_minutes numeric, sessions bigint, minutes_7d numeric, tasks_completed int
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.username::text, p.display_name, p.role, p.status, p.created_at, p.last_seen,
      coalesce(sum(s.minutes) filter (where s.type = 'focus'), 0),
      count(s.id) filter (where s.type = 'focus'),
      coalesce(sum(s.minutes) filter (where s.type = 'focus' and s.at > now() - interval '7 days'), 0),
      coalesce((select (us.data ->> 'tasksCompleted')::int from public.user_state us where us.user_id = p.id), 0)
    from public.profiles p
    left join public.focus_sessions s on s.user_id = p.id
    where search = '' or p.email ilike '%' || search || '%' or p.display_name ilike '%' || search || '%' or p.username::text ilike '%' || search || '%'
    group by p.id
    order by p.created_at desc
    limit least(greatest(lim, 1), 500) offset greatest(off, 0);
end;
$$;

create or replace function public.admin_user_daily(target uuid, days int default 30)
returns table (day date, minutes numeric, sessions bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select g.day::date,
      coalesce(sum(s.minutes) filter (where s.type = 'focus'), 0),
      count(s.id) filter (where s.type = 'focus')
    from generate_series(date_trunc('day', now()) - make_interval(days => least(greatest(days, 7), 365) - 1), date_trunc('day', now()), interval '1 day') as g(day)
    left join public.focus_sessions s on s.user_id = target and s.at >= g.day and s.at < g.day + interval '1 day'
    group by g.day order by g.day;
end;
$$;

drop function if exists public.admin_set_role(uuid, text);

revoke execute on function public.admin_overview(int), public.admin_users(text, int, int), public.admin_user_daily(uuid, int), public.is_staff(), public.is_admin() from public, anon;
grant execute on function public.admin_overview(int), public.admin_users(text, int, int), public.admin_user_daily(uuid, int), public.is_staff(), public.is_admin() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
