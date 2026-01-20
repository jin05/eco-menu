import { createBrowserClient } from '@supabase/ssr'

// =============================================
// Supabase Client (Client Components用)
// =============================================

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// シングルトンインスタンス（クライアントサイドで再利用）
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createClient()
  }
  return client
}
