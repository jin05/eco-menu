import OpenAI from 'openai'

// =============================================
// OpenAI Client Configuration
// =============================================

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 使用するモデル
export const MODEL = 'gpt-4o' as const

// =============================================
// Response Types
// =============================================

export interface AnalyzeImageResponse {
  ingredients: string[]
}

export interface DayMenu {
  day: number
  main_dish: string
  side_dish: string
  instructions: string
}

export interface GenerateMenuResponse {
  days: DayMenu[]
  shopping_list: string[]
}
