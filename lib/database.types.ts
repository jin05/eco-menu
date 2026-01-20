// =============================================
// Supabase Database Types
// 実際の運用時は `supabase gen types typescript` で自動生成推奨
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          user_id: string
          name: string
          quantity: string | null
          category: string | null
          expiry_date: string | null
          added_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          quantity?: string | null
          category?: string | null
          expiry_date?: string | null
          added_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          quantity?: string | null
          category?: string | null
          expiry_date?: string | null
          added_at?: string
          updated_at?: string
        }
      }
      meal_history: {
        Row: {
          id: string
          user_id: string
          date: string
          menu_json: MenuJson
          used_ingredients: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          menu_json: MenuJson
          used_ingredients?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          menu_json?: MenuJson
          used_ingredients?: string[] | null
          created_at?: string
        }
      }
    }
  }
}

// =============================================
// 献立JSONの型定義
// =============================================

export interface MenuJson {
  meals: DayMenu[]
}

export interface DayMenu {
  date: string
  breakfast?: Meal
  lunch?: Meal
  dinner: Meal
}

export interface Meal {
  name: string
  description?: string
  ingredients: string[]
  instructions?: string[]
  cookingTime?: string
  calories?: number
}

// =============================================
// 便利な型エイリアス
// =============================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Ingredient = Database['public']['Tables']['ingredients']['Row']
export type MealHistory = Database['public']['Tables']['meal_history']['Row']

export type NewIngredient = Database['public']['Tables']['ingredients']['Insert']
export type NewMealHistory = Database['public']['Tables']['meal_history']['Insert']
