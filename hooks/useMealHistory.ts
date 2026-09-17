'use client'

import { useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import type { GenerateMenuResponse } from '@/lib/anthropic'

// =============================================
// 履歴データの型定義
// =============================================

export interface MealHistoryItem {
  date: string
  main_dish: string
}

/**
 * 献立の保存先。
 * - remote: Supabaseに保存（端末をまたいで残る）
 * - local: 未ログインのためローカルのみ
 * - local-fallback: Supabaseへの保存に失敗しローカルのみ
 */
export type SaveDestination = 'remote' | 'local' | 'local-fallback'

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
  /**
   * 直近N件の献立履歴を取得する
   * マンネリ防止のため、過去のメイン料理名を返す
   */
  const fetchRecentHistory = useCallback(async (limit: number = 3): Promise<MealHistoryItem[]> => {
    try {
      const supabase = getSupabaseClient()
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
  }, [])

  /**
   * 献立をデータベースに保存する
   */
  const saveMenuToHistory = useCallback(async (
    menuResult: GenerateMenuResponse,
    usedIngredients: string[]
  ): Promise<SaveDestination> => {
    // オフライン時や保存失敗時のフォールバックとして常にローカルにも残す
    saveLocalHistory(menuResult, usedIngredients)

    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return 'local'
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
        return 'local-fallback'
      }

      return 'remote'
    } catch (err) {
      console.error('保存エラー:', err)
      return 'local-fallback'
    }
  }, [])

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
