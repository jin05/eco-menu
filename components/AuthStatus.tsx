'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient, hasSupabaseConfig } from '@/lib/supabase'

export default function AuthStatus() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const configured = hasSupabaseConfig()

  useEffect(() => {
    if (!configured) {
      setIsLoading(false)
      return
    }

    const supabase = getSupabaseClient()

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setIsLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [configured])

  const signOut = async () => {
    await getSupabaseClient().auth.signOut()
    router.refresh()
  }

  if (!configured) {
    return <StatusBadge label="ローカル保存モード" />
  }

  if (isLoading) {
    return null
  }

  if (!email) {
    return (
      <div className="flex items-center gap-3">
        <StatusBadge label="ローカル保存中" />
        <Link
          href="/login"
          className="text-sm font-medium text-green-600 hover:text-green-700 underline"
        >
          ログイン
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 truncate max-w-[180px]" title={email}>
        {email}
      </span>
      <button
        onClick={signOut}
        className="text-sm font-medium text-gray-500 hover:text-gray-700 underline"
      >
        ログアウト
      </button>
    </div>
  )
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
      {label}
    </span>
  )
}
