import Anthropic from '@anthropic-ai/sdk'

// =============================================
// Anthropic Client Configuration
// =============================================

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 使用するモデル
export const MODEL = 'claude-3-5-sonnet-20241022' as const

// デフォルトの最大トークン数
export const DEFAULT_MAX_TOKENS = 1024

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

// =============================================
// Helper Functions
// =============================================

/**
 * Base64データURLからメディアタイプと純粋なBase64データを抽出する
 * @param dataUrl - data:image/jpeg;base64,... 形式の文字列
 * @returns { mediaType, data } または null (パース失敗時)
 */
export function parseBase64DataUrl(dataUrl: string): {
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  data: string
} | null {
  const match = dataUrl.match(/^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/)
  if (!match) {
    return null
  }
  return {
    mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    data: match[3],
  }
}
