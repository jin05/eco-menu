import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { hasSupabaseConfig, getSupabaseConfig } from '@/lib/supabase-config'

interface CookieToSet {
  name: string
  value: string
  options: CookieOptions
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Supabase未設定でもアプリ自体は（ローカル保存モードで）動くようにする
  if (!hasSupabaseConfig()) {
    return response
  }

  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[], headers: Record<string, string>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        // 認証Cookieを含むレスポンスがCDNにキャッシュされると
        // 別のユーザーにセッションが漏れるため、必ず一緒に設定する
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })

  // レスポンス確定前にトークンを更新しておく必要がある
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // 静的アセットと画像最適化のリクエストは対象外にする
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
