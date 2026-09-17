'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase'

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'ログインリンクが不正です。もう一度お試しください。',
  exchange_failed:
    'ログインリンクの有効期限が切れています。もう一度メールを送信してください。',
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    ERROR_MESSAGES[searchParams.get('error') ?? ''] ?? null
  )

  const configured = hasSupabaseConfig()

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSending(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signInError) {
        setError('メールの送信に失敗しました。時間をおいて再度お試しください。')
        return
      }

      setSent(true)
    } catch {
      setError('メールの送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSending(false)
    }
  }

  if (!configured) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">ログイン</h2>
        <p className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          Supabaseが設定されていないため、ログインは利用できません。献立は
          この端末のローカル保存のみになります。
        </p>
        <Link href="/" className="text-green-600 hover:text-green-700 underline text-sm">
          トップに戻る
        </Link>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">メールを送信しました</h2>
        <p className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {email} 宛にログインリンクを送信しました。メール内のリンクを開くと
          ログインが完了します。
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-green-600 hover:text-green-700 underline text-sm"
        >
          別のメールアドレスで送信する
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">ログイン</h2>
        <p className="text-gray-600 mt-2 text-sm">
          ログインすると、献立の履歴が端末をまたいで保存されます
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={sendMagicLink} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
          autoComplete="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl
            focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-xl
            hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? '送信中...' : 'ログインリンクを送信'}
        </button>
      </form>

      <p className="text-center">
        <Link href="/" className="text-green-600 hover:text-green-700 underline text-sm">
          ログインせずに使う
        </Link>
      </p>
    </div>
  )
}
