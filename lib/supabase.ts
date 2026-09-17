import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './supabase-config'

// =============================================
// Supabase Client (Client Components用)
// =============================================

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createBrowserClient(url, anonKey)
}

// シングルトンインスタンス（クライアントサイドで再利用）
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createClient()
  }
  return client
}

export { MissingSupabaseConfigError, hasSupabaseConfig } from './supabase-config'
