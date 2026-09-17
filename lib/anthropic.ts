import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

// =============================================
// Anthropic Client Configuration
// =============================================

// APIキー未設定のまま起動すると、実行時に分かりにくい認証エラーになるため
// 呼び出し側で事前に検知できるようにする
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new MissingApiKeyError()
  }
  return new Anthropic({ apiKey })
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY が設定されていません。.env.local を確認してください。')
    this.name = 'MissingApiKeyError'
  }
}

// 使用するモデル
export const MODEL = 'claude-opus-5' as const

// デフォルトの最大トークン数
export const DEFAULT_MAX_TOKENS = 4096

// =============================================
// Response Schemas
// structured outputs で出力形式を強制し、同時に実行時バリデーションも行う
// =============================================

export const AnalyzeImageSchema = z.object({
  ingredients: z.array(z.string()),
})

export const DayMenuSchema = z.object({
  day: z.number(),
  main_dish: z.string(),
  side_dish: z.string(),
  instructions: z.string(),
})

export const GenerateMenuSchema = z.object({
  days: z.array(DayMenuSchema),
  shopping_list: z.array(z.string()),
})

export type AnalyzeImageResponse = z.infer<typeof AnalyzeImageSchema>
export type DayMenu = z.infer<typeof DayMenuSchema>
export type GenerateMenuResponse = z.infer<typeof GenerateMenuSchema>

// =============================================
// Helper Functions
// =============================================

export const SUPPORTED_IMAGE_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type SupportedImageMediaType = (typeof SUPPORTED_IMAGE_MEDIA_TYPES)[number]

/**
 * Base64データURLからメディアタイプと純粋なBase64データを抽出する
 * @param dataUrl - data:image/jpeg;base64,... 形式の文字列
 * @returns { mediaType, data } または null (パース失敗時)
 */
export function parseBase64DataUrl(dataUrl: string): {
  mediaType: SupportedImageMediaType
  data: string
} | null {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/
  )
  if (!match) {
    return null
  }
  return {
    mediaType: match[1] as SupportedImageMediaType,
    data: match[2],
  }
}

/**
 * Base64文字列からデコード後のバイト数を算出する（実際にデコードはしない）
 */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}
