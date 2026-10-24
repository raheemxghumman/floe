// Privileged user management for the floe admin panel.
// Runs on Supabase with the service-role key; the browser never sees it.
// Every call re-checks the caller's role from the database.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ROLES = ['user', 'moderator', 'admin'] as const
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FOREVER = '876000h' // ~100 years; Supabase's way of saying "banned"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = await sb.auth.getUser(token)
    const caller = auth?.user
    if (!caller) return json({ error: 'Please sign in again.' }, 401)

    const { data: me } = await sb.from('profiles').select('role, status').eq('id', caller.id).single()
    if (!me || me.status !== 'active' || (me.role !== 'admin' && me.role !== 'moderator')) return json({ error: 'You don’t have access to this.' }, 403)
    const isAdmin = me.role === 'admin'

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')
    const target = typeof body.userId === 'string' ? body.userId : null
    const targetRole = target
      ? (await sb.from('profiles').select('role').eq('id', target).single()).data?.role as string | undefined
      : undefined
    if (target && !targetRole) return json({ error: 'User not found.' }, 404)
    if (target && target === caller.id && action !== 'reset_password' && action !== 'grant_xp') return json({ error: 'You can’t do that to your own account.' }, 400)
    const needAdmin = () => (isAdmin ? null : json({ error: 'Only admins can do that.' }, 403))

    switch (action) {
      case 'create': {
        const denied = needAdmin(); if (denied) return denied
        const email = String(body.email ?? '').trim().toLowerCase()
        const username = String(body.username ?? '').trim()
        const password = String(body.password ?? '')
        const role = ROLES.includes(body.role) ? body.role : 'user'
        if (!EMAIL.test(email)) return json({ error: 'Enter a valid email.' }, 400)
        if (!USERNAME.test(username)) return json({ error: 'Username must be 3–20 letters, numbers or _.' }, 400)
        if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
        const { data: taken } = await sb.from('profiles').select('id').ilike('username', username).maybeSingle()
        if (taken) return json({ error: 'That username is taken.' }, 409)
        const { data, error } = await sb.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { username, display_name: String(body.displayName ?? '').trim() || username },
        })
        if (error) return json({ error: error.message }, 400)
        if (role !== 'user') await sb.from('profiles').update({ role }).eq('id', data.user.id)
        return json({ user: { id: data.user.id, email, username, role } })
      }

      case 'set_role': {
        const denied = needAdmin(); if (denied) return denied
        if (!ROLES.includes(body.role)) return json({ error: 'Unknown role.' }, 400)
        const { error } = await sb.from('profiles').update({ role: body.role }).eq('id', target!)
        return error ? json({ error: error.message }, 400) : json({ ok: true })
      }

      case 'suspend':
      case 'unsuspend': {
        // moderators may only act on regular users
        if (!isAdmin && targetRole !== 'user') return json({ error: 'Moderators can only suspend regular users.' }, 403)
        const suspend = action === 'suspend'
        const { error } = await sb.auth.admin.updateUserById(target!, { ban_duration: suspend ? FOREVER : 'none' })
        if (error) return json({ error: error.message }, 400)
        await sb.from('profiles').update({ status: suspend ? 'suspended' : 'active' }).eq('id', target!)
        return json({ ok: true })
      }

      case 'delete': {
        const denied = needAdmin(); if (denied) return denied
        const { error } = await sb.auth.admin.deleteUser(target!)
        return error ? json({ error: error.message }, 400) : json({ ok: true })
      }

      case 'reset_password': {
        const denied = needAdmin(); if (denied) return denied
        const password = String(body.password ?? '')
        if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
        const { error } = await sb.auth.admin.updateUserById(target ?? caller.id, { password })
        return error ? json({ error: error.message }, 400) : json({ ok: true })
      }

      case 'grant_xp': {
        const denied = needAdmin(); if (denied) return denied
        const amount = Math.trunc(Number(body.amount))
        if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return json({ error: 'Enter an amount between -1,000,000 and 1,000,000.' }, 400)
        const { data: row } = await sb.from('profiles').select('bonus_xp').eq('id', target ?? caller.id).single()
        const bonus = Math.min(100_000_000, Math.max(0, (row?.bonus_xp ?? 0) + amount))
        const { error } = await sb.from('profiles').update({ bonus_xp: bonus }).eq('id', target ?? caller.id)
        return error ? json({ error: error.message }, 400) : json({ ok: true, bonus_xp: bonus })
      }

      default:
        return json({ error: 'Unknown action.' }, 400)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500)
  }
})
