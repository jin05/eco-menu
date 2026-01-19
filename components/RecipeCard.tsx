'use client'

import { DayMenu } from '@/lib/openai'

interface RecipeCardProps {
  menu: DayMenu
  index: number
}

// 日付に応じた装飾色
const dayColors = [
  { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-500', icon: '🌅' },
  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500', icon: '☀️' },
  { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-500', icon: '🌙' },
]

export default function RecipeCard({ menu, index }: RecipeCardProps) {
  const colors = dayColors[index % dayColors.length]

  return (
    <div
      className={`
        relative rounded-2xl border-2 ${colors.border} ${colors.bg}
        p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1
      `}
    >
      {/* Day badge */}
      <div
        className={`
          absolute -top-3 left-6 px-4 py-1 ${colors.badge} text-white
          text-sm font-bold rounded-full shadow-md
        `}
      >
        {colors.icon} {menu.day}日目
      </div>

      {/* Main dish */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🍳</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            メイン
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 leading-tight">
          {menu.main_dish}
        </h3>
      </div>

      {/* Side dish */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🥗</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            副菜
          </span>
        </div>
        <p className="text-gray-700">{menu.side_dish}</p>
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📝</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            作り方
          </span>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          {menu.instructions}
        </p>
      </div>
    </div>
  )
}

// 買い物リストコンポーネント
interface ShoppingListProps {
  items: string[]
}

export function ShoppingList({ items }: ShoppingListProps) {
  if (items.length === 0) return null

  return (
    <div className="mt-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🛒</span>
        <h3 className="text-lg font-bold text-amber-800">買い足しリスト</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-white border border-amber-300 text-amber-800
              rounded-full text-sm font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ローディングスケルトン
export function RecipeCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 animate-pulse">
      <div className="h-6 w-20 bg-gray-300 rounded-full mb-6" />
      <div className="space-y-4">
        <div>
          <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
          <div className="h-6 w-48 bg-gray-300 rounded" />
        </div>
        <div>
          <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-36 bg-gray-200 rounded" />
        </div>
        <div className="pt-4 border-t border-gray-200">
          <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
