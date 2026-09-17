// =============================================
// Supabase の接続設定
// =============================================

export class MissingSupabaseConfigError extends Error {
  constructor() {
    super(
      'Supabaseの環境変数が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
    )
    this.name = 'MissingSupabaseConfigError'
  }
}

export interface SupabaseConfig {
  url: string
  anonKey: string
}

// NEXT_PUBLIC_* はビルド時にインライン展開されるため、
// process.env をプロパティごとに直接参照する必要がある
export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new MissingSupabaseConfigError()
  }

  return { url, anonKey }
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
