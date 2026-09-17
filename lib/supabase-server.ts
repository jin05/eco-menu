import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './supabase-config'

// =============================================
// Supabase Client (Server Components用)
// =============================================

interface CookieToSet {
  name: string
  value: string
  options: CookieOptions
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Componentからの呼び出し時は書き込めない。
          // セッション更新は middleware 側で行われるため無視してよい。
        }
      },
    },
  })
}

// =============================================
// Supabase Admin Client (Service Role用)
// サーバーサイドでRLSをバイパスする必要がある場合のみ使用
// =============================================

export function createAdminClient() {
  const { url } = getSupabaseConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
