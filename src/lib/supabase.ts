import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

/** null when the build has no Supabase config: floe then runs fully local. */
export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'floe-auth' } })
  : null

export const cloudEnabled = supabase !== null

export type Role = 'user' | 'moderator' | 'admin'
export interface Profile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  role: Role
  status: 'active' | 'suspended'
  created_at: string
  last_seen: string
}

/** Calls an Edge Function and turns its `{ error }` body into a thrown Error.
 *  On a 401 it refreshes the session and retries once; if that fails the stale
 *  session is dropped locally so the sign-in screen appears. */
export async function callFn<T>(name: string, body: object, retried = false): Promise<T> {
  if (!supabase) throw new Error('Accounts aren’t configured.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx?.status === 401 && name !== 'login') {
      if (!retried && !(await supabase.auth.refreshSession()).error) return callFn<T>(name, body, true)
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('Your session expired. Please sign in again.')
    }
    // FunctionsHttpError carries the response; surface our friendly message
    const msg = ctx ? await ctx.json().then((j: { error?: string }) => j.error).catch(() => null) : null
    throw new Error(msg ?? error.message)
  }
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String((data as { error: unknown }).error))
  return data as T
}
