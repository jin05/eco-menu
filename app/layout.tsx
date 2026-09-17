import type { Metadata } from 'next'
import Link from 'next/link'
import AuthStatus from '@/components/AuthStatus'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIエコ献立 | 食材から3日分の献立を自動提案',
  description: '冷蔵庫の写真やレシートから食材を認識し、フードロスを減らす3日分の献立を自動提案します。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
            <div>
              <Link href="/">
                <h1 className="text-2xl font-bold text-green-600 flex items-center gap-2">
                  <span className="text-3xl">🥬</span>
                  AIエコ献立
                </h1>
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                食材を無駄なく使い切る、3日分の献立提案
              </p>
            </div>
            <div className="pt-1 flex-shrink-0">
              <AuthStatus />
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t bg-white mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
            © 2026 AIエコ献立 - フードロス削減プロジェクト
          </div>
        </footer>
      </body>
    </html>
  )
}
