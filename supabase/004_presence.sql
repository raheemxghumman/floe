-- 004: live presence for the admin "Live" page. Safe to re-run.
-- Each signed-in tab sends a small heartbeat (which screen, timer state, device) through presence_ping().
-- The table has RLS on and no policies: clients can only write through the functions below, and only admins can read.

create table if not exists public.presence (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  online        boolean not null default true,
  page          text not null default 'app',      -- app | admin
  view          text,                             -- home | focus | ambient
  settings_open boolean not null default false,
  tab_hidden    boolean not null default false,
  timer_kind    text,                             -- pomodoro | countdown | stopwatch
  timer_mode    text,                             -- focus | short | long
  timer_running boolean not null default false,
  timer_left_s  integer,
  timer_at      timestamptz,                      -- when timer_left_s was measured
  task_active   boolean not null default false,
  today_min     integer not null default 0,
  streak        integer not null default 0,
  device        text,
  browser       text,
  online_since  timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

-- A gap of more than 3 minutes since the last heartbeat (or an explicit leave) starts a new visit.
create or replace function public.presence_ping(info jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.presence as p (user_id, online, page, view, settings_open, tab_hidden, timer_kind, timer_mode, timer_running,
    timer_left_s, timer_at, task_active, today_min, streak, device, browser, online_since, last_seen)
  values (uid, true,
    left(coalesce(info ->> 'page', 'app'), 10), left(info ->> 'view', 10), coalesce((info ->> 'settings_open')::boolean, false),
    coalesce((info ->> 'tab_hidden')::boolean, false), left(info ->> 'timer_kind', 12), left(info ->> 'timer_mode', 8),
    coalesce((info ->> 'timer_running')::boolean, false), least(greatest((info ->> 'timer_left_s')::int, 0), 86400), now(),
    coalesce((info ->> 'task_active')::boolean, false), least(greatest(coalesce((info ->> 'today_min')::int, 0), 0), 1440),
    least(greatest(coalesce((info ->> 'streak')::int, 0), 0), 10000), left(info ->> 'device', 20), left(info ->> 'browser', 20), now(), now())
  on conflict (user_id) do update set
    online = true, page = excluded.page, view = excluded.view, settings_open = excluded.settings_open, tab_hidden = excluded.tab_hidden,
    timer_kind = excluded.timer_kind, timer_mode = excluded.timer_mode, timer_running = excluded.timer_running,
    timer_left_s = excluded.timer_left_s, timer_at = excluded.timer_at, task_active = excluded.task_active,
    today_min = excluded.today_min, streak = excluded.streak, device = excluded.device, browser = excluded.browser,
    online_since = case when not p.online or p.last_seen < now() - interval '3 minutes' then now() else p.online_since end,
    last_seen = now()
  -- someone with floe open in one tab and the admin panel in another: the app tab is what matters
  where excluded.page = 'app' or p.page = 'admin' or not p.online or p.last_seen < now() - interval '90 seconds';
  update public.profiles set last_seen = now() where id = uid;
end;
$$;

create or replace function public.presence_leave() returns void
language sql security definer set search_path = '' as $$
  update public.presence set online = false, last_seen = now() where user_id = auth.uid();
$$;

-- Everyone seen in the last `hours`; the page treats a heartbeat within 90 s as online.
create or replace function public.admin_presence(hours int default 24)
returns table (
  user_id uuid, username text, display_name text, email text, role text,
  online boolean, page text, view text, settings_open boolean, tab_hidden boolean,
  timer_kind text, timer_mode text, timer_running boolean, timer_left_s integer, timer_at timestamptz,
  task_active boolean, today_min integer, streak integer, device text, browser text,
  online_since timestamptz, last_seen timestamptz, last_sign_in timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
    select pr.user_id, p.username::text, p.display_name, p.email, p.role,
      (pr.online and pr.last_seen > now() - interval '90 seconds'), pr.page, pr.view, pr.settings_open, pr.tab_hidden,
      pr.timer_kind, pr.timer_mode, pr.timer_running, pr.timer_left_s, pr.timer_at,
      pr.task_active, pr.today_min, pr.streak, pr.device, pr.browser,
      pr.online_since, pr.last_seen, u.last_sign_in_at
    from public.presence pr
    join public.profiles p on p.id = pr.user_id
    join auth.users u on u.id = pr.user_id
    where pr.last_seen > now() - make_interval(hours => least(greatest(hours, 1), 720))
    order by pr.last_seen desc;
end;
$$;

revoke execute on function public.presence_ping(jsonb), public.presence_leave(), public.admin_presence(int) from public, anon;
grant execute on function public.presence_ping(jsonb), public.presence_leave(), public.admin_presence(int) to authenticated;
