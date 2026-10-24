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

/** Calls an Edge Function and turns its `{ error }` body into a thrown Error. */
export async function callFn<T>(name: string, body: object): Promise<T> {
  if (!supabase) throw new Error('Accounts aren’t configured.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    // FunctionsHttpError carries the response; surface our friendly message
    const ctx = (error as { context?: Response }).context
    const msg = ctx ? await ctx.json().then((j: { error?: string }) => j.error).catch(() => null) : null
    throw new Error(msg ?? error.message)
  }
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String((data as { error: unknown }).error))
  return data as T
}
