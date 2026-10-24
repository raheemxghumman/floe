-- 003: companion XP. Earned XP is derived from history; admins can grant bonus XP on top.
-- Users can't edit bonus_xp (column grants on profiles only allow display_name and last_seen).

alter table public.profiles add column if not exists bonus_xp integer not null default 0;
alter table public.profiles drop constraint if exists profiles_bonus_xp_range;
alter table public.profiles add constraint profiles_bonus_xp_range check (bonus_xp between 0 and 100000000);

-- earned XP mirrors the client formula in src/lib/levels.ts:
--   1 per focus minute + 5 per completed task + 20 per day with at least one focus session
drop function if exists public.admin_users(text, int, int);
create function public.admin_users(search text default '', lim int default 100, off int default 0)
returns table (
  id uuid, email text, username text, display_name text, role text, status text,
  created_at timestamptz, last_seen timestamptz, focus_minutes numeric, sessions bigint, minutes_7d numeric,
  tasks_completed int, bonus_xp int, xp bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    with agg as (
      select p.id,
        coalesce(sum(s.minutes) filter (where s.type = 'focus'), 0) as focus_minutes,
        count(s.id) filter (where s.type = 'focus') as sessions,
        coalesce(sum(s.minutes) filter (where s.type = 'focus' and s.at > now() - interval '7 days'), 0) as minutes_7d,
        count(distinct date_trunc('day', s.at)) filter (where s.type = 'focus') as active_days,
        coalesce((select (us.data ->> 'tasksCompleted')::int from public.user_state us where us.user_id = p.id), 0) as tasks_completed
      from public.profiles p
      left join public.focus_sessions s on s.user_id = p.id
      group by p.id
    )
    select p.id, p.email, p.username::text, p.display_name, p.role, p.status, p.created_at, p.last_seen,
      a.focus_minutes, a.sessions, a.minutes_7d, a.tasks_completed, p.bonus_xp,
      (round(a.focus_minutes) + a.tasks_completed * 5 + a.active_days * 20 + p.bonus_xp)::bigint as xp
    from public.profiles p
    join agg a on a.id = p.id
    where search = '' or p.email ilike '%' || search || '%' or p.display_name ilike '%' || search || '%' or p.username::text ilike '%' || search || '%'
    order by p.created_at desc
    limit least(greatest(lim, 1), 500) offset greatest(off, 0);
end;
$$;

revoke execute on function public.admin_users(text, int, int) from public, anon;
grant execute on function public.admin_users(text, int, int) to authenticated;
