'use client'

import { useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { GenerateMenuResponse } from '@/lib/openai'

// =============================================
// 履歴データの型定義
// =============================================

export interface MealHistoryItem {
  date: string
  main_dish: string
}

export interface MealHistoryRecord {
  id: string
  user_id: string
  date: string
  menu_json: {
    days: Array<{
      day: number
      main_dish: string
      side_dish: string
      instructions: string
    }>
    shopping_list: string[]
  }
  used_ingredients: string[] | null
  created_at: string
}

// =============================================
// 献立履歴のカスタムフック
// =============================================

export function useMealHistory() {
  const supabase = getSupabaseClient()

  /**
   * 直近N件の献立履歴を取得する
   * マンネリ防止のため、過去のメイン料理名を返す
   */
  const fetchRecentHistory = useCallback(async (limit: number = 3): Promise<MealHistoryItem[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('ユーザー未認証: ローカルストレージから履歴を取得')
        return getLocalHistory(limit)
      }

      const { data, error } = await supabase
        .from('meal_history')
        .select('date, menu_json')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('履歴取得エラー:', error)
        return getLocalHistory(limit)
      }

      // 各日のメイン料理を抽出
      const history: MealHistoryItem[] = []
      for (const record of data || []) {
        const menuJson = record.menu_json as MealHistoryRecord['menu_json']
        if (menuJson?.days) {
          for (const day of menuJson.days) {
            history.push({
              date: record.date,
              main_dish: day.main_dish,
            })
          }
        }
      }

      return history.slice(0, limit * 3) // 各レコードに3日分あるので調整
    } catch (err) {
      console.error('履歴取得エラー:', err)
      return getLocalHistory(limit)
    }
  }, [supabase])

  /**
   * 献立をデータベースに保存する
   */
  const saveMenuToHistory = useCallback(async (
    menuResult: GenerateMenuResponse,
    usedIngredients: string[]
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('ユーザー未認証: ローカルストレージに保存')
        saveLocalHistory(menuResult, usedIngredients)
        return true
      }

      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('meal_history')
        .insert({
          user_id: user.id,
          date: today,
          menu_json: menuResult,
          used_ingredients: usedIngredients,
        })

      if (error) {
        console.error('保存エラー:', error)
        // フォールバックとしてローカルに保存
        saveLocalHistory(menuResult, usedIngredients)
        return false
      }

      // ローカルにも保存（オフライン対応）
      saveLocalHistory(menuResult, usedIngredients)
      return true
    } catch (err) {
      console.error('保存エラー:', err)
      saveLocalHistory(menuResult, usedIngredients)
      return false
    }
  }, [supabase])

  return {
    fetchRecentHistory,
    saveMenuToHistory,
  }
}

// =============================================
// ローカルストレージのヘルパー関数
// （未認証ユーザー用のフォールバック）
// =============================================

const LOCAL_STORAGE_KEY = 'eco-menu-history'

interface LocalHistoryEntry {
  date: string
  menuResult: GenerateMenuResponse
  usedIngredients: string[]
  savedAt: string
}

function getLocalHistory(limit: number): MealHistoryItem[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return []

    const entries: LocalHistoryEntry[] = JSON.parse(stored)
    const history: MealHistoryItem[] = []

    // 最新のエントリから履歴を抽出
    const recentEntries = entries.slice(-limit)
    for (const entry of recentEntries) {
      for (const day of entry.menuResult.days) {
        history.push({
          date: entry.date,
          main_dish: day.main_dish,
        })
      }
    }

    return history
  } catch {
    return []
  }
}

function saveLocalHistory(
  menuResult: GenerateMenuResponse,
  usedIngredients: string[]
): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    const entries: LocalHistoryEntry[] = stored ? JSON.parse(stored) : []

    const newEntry: LocalHistoryEntry = {
      date: new Date().toISOString().split('T')[0],
      menuResult,
      usedIngredients,
      savedAt: new Date().toISOString(),
    }

    entries.push(newEntry)

    // 最新10件のみ保持
    const trimmedEntries = entries.slice(-10)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmedEntries))
  } catch (err) {
    console.error('ローカル保存エラー:', err)
  }
}
