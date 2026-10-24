// Sign in with a username OR an email. Usernames are resolved to emails here,
// on the server, so email addresses are never exposed to the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const INVALID = 'Wrong username/email or password.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const opts = { auth: { persistSession: false, autoRefreshToken: false } }
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, opts)
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, opts)

  try {
    const { identifier, password } = await req.json()
    const id = String(identifier ?? '').trim()
    if (!id || !password) return json({ error: INVALID }, 400)

    let email = id.toLowerCase()
    if (!id.includes('@')) {
      const { data } = await service.from('profiles').select('email').ilike('username', id).maybeSingle()
      if (!data?.email) return json({ error: INVALID }, 400)
      email = data.email
    }

    const { data, error } = await anon.auth.signInWithPassword({ email, password: String(password) })
    if (error) {
      const msg = /banned/i.test(error.message) ? 'This account is suspended.'
        : /confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox.'
        : INVALID
      return json({ error: msg }, 400)
    }
    return json({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } })
  } catch {
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})
