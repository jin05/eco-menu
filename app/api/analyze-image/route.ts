import { NextRequest, NextResponse } from 'next/server'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import Anthropic from '@anthropic-ai/sdk'
import {
  getAnthropicClient,
  MissingApiKeyError,
  MODEL,
  DEFAULT_MAX_TOKENS,
  AnalyzeImageSchema,
  parseBase64DataUrl,
  base64ByteLength,
} from '@/lib/anthropic'
import { checkRateLimit, getClientKey } from '@/lib/rate-limit'

// =============================================
// POST /api/analyze-image
// 画像から食材を認識してリスト化する
// =============================================

interface RequestBody {
  image?: unknown // Base64 data URL (data:image/jpeg;base64,...)
}

// Vision APIはコストが高いため、他エンドポイントより厳しめに制限する
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW_MS = 60_000

// デコード後の画像サイズ上限。クライアント側で圧縮してから送る前提。
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const systemPrompt = `あなたは食材認識の専門家です。
画像に写っている食材を正確に特定し、日本語で回答してください。

注意事項:
- 野菜、果物、肉、魚、調味料など、すべての食材を認識してください
- レシートの場合は、記載されている食品名を読み取ってください
- 不明確な場合は、最も可能性の高い食材名を記載してください
- 調理済み食品は、その名称で記載してください`

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(
    `analyze-image:${getClientKey(request)}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS
  )
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'リクエストが多すぎます。しばらく待ってから再度お試しください。' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'リクエストの形式が不正です' },
      { status: 400 }
    )
  }

  if (typeof body.image !== 'string' || body.image.length === 0) {
    return NextResponse.json(
      { error: '画像が提供されていません' },
      { status: 400 }
    )
  }

  // Base64データURLをパースしてメディアタイプとデータを抽出
  const parsed = parseBase64DataUrl(body.image)
  if (!parsed) {
    return NextResponse.json(
      { error: '画像形式が不正です。JPEG、PNG、GIF、WebP形式の画像を使用してください。' },
      { status: 400 }
    )
  }

  if (base64ByteLength(parsed.data) > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: `画像サイズが大きすぎます。${Math.floor(
          MAX_IMAGE_BYTES / 1024 / 1024
        )}MB以下の画像を使用してください。`,
      },
      { status: 413 }
    )
  }

  try {
    const client = getAnthropicClient()

    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      output_config: { format: zodOutputFormat(AnalyzeImageSchema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: parsed.mediaType,
                data: parsed.data,
              },
            },
            {
              type: 'text',
              text: '画像内の食材を特定してください。',
            },
          ],
        },
      ],
    })

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: 'AIの応答を解析できませんでした' },
        { status: 502 }
      )
    }

    return NextResponse.json(response.parsed_output)
  } catch (error) {
    return handleError(error)
  }
}

function handleError(error: unknown): NextResponse {
  console.error('Image analysis error:', error)

  if (error instanceof MissingApiKeyError) {
    return NextResponse.json(
      { error: 'サーバーの設定が不完全です。管理者にお問い合わせください。' },
      { status: 500 }
    )
  }

  if (error instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: 'AIが混み合っています。しばらく待ってから再度お試しください。' },
      { status: 429 }
    )
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return NextResponse.json(
      { error: 'サーバーの設定が不完全です。管理者にお問い合わせください。' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: '画像の解析中にエラーが発生しました' },
    { status: 500 }
  )
}
