import { NextRequest, NextResponse } from 'next/server'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import Anthropic from '@anthropic-ai/sdk'
import {
  getAnthropicClient,
  MissingApiKeyError,
  MODEL,
  GenerateMenuSchema,
} from '@/lib/anthropic'
import { checkRateLimit, getClientKey } from '@/lib/rate-limit'

// =============================================
// POST /api/generate-menu
// 食材と履歴から3日分の献立を生成する
// =============================================

interface HistoryItem {
  date: string
  main_dish: string
}

interface RequestBody {
  ingredients?: unknown // 現在の食材リスト
  history?: unknown // 過去の献立履歴
}

const RATE_LIMIT = 20
const RATE_LIMIT_WINDOW_MS = 60_000

const MAX_INGREDIENTS = 50
const MAX_INGREDIENT_LENGTH = 50
const MAX_HISTORY_ITEMS = 20

const MENU_DAYS = 3

const systemPrompt = `あなたは優秀な料理研究家です。

与えられた食材を効率的に使い切る${MENU_DAYS}日分の献立を考えてください。

重要なルール:
1. 提供された食材を${MENU_DAYS}日間で使い切ること（フードロス削減）
2. 過去の履歴とメイン料理が被らないようにすること
3. 栄養バランスを考慮すること
4. 家庭で作りやすい料理を提案すること
5. 買い足しが必要な基本調味料（塩、醤油、油など）はshopping_listに記載
6. daysは必ず${MENU_DAYS}件、dayは1から${MENU_DAYS}の連番にすること
7. instructionsは簡単な調理手順を2-3文で記載すること`

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(
    `generate-menu:${getClientKey(request)}`,
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

  const ingredients = parseIngredients(body.ingredients)
  if ('error' in ingredients) {
    return NextResponse.json({ error: ingredients.error }, { status: 400 })
  }

  const history = parseHistory(body.history)

  const historyText =
    history.length > 0
      ? history.map((h) => `- ${h.date}: ${h.main_dish}`).join('\n')
      : 'なし'

  const userPrompt = `【現在の食材】
${ingredients.value.join('、')}

【過去の献立履歴】
${historyText}

上記の食材を使って、${MENU_DAYS}日分の献立を考えてください。
過去の履歴と被らないメニューにしてください。`

  try {
    const client = getAnthropicClient()

    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      output_config: { format: zodOutputFormat(GenerateMenuSchema) },
      messages: [{ role: 'user', content: userPrompt }],
    })

    const result = response.parsed_output
    if (!result) {
      return NextResponse.json(
        { error: 'AIの応答を解析できませんでした' },
        { status: 502 }
      )
    }

    if (result.days.length !== MENU_DAYS) {
      return NextResponse.json(
        { error: '献立の生成に失敗しました。再度お試しください。' },
        { status: 502 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return handleError(error)
  }
}

type ParseResult<T> = { value: T } | { error: string }

function parseIngredients(input: unknown): ParseResult<string[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: '食材リストが提供されていません' }
  }

  if (input.length > MAX_INGREDIENTS) {
    return { error: `食材は${MAX_INGREDIENTS}件までにしてください` }
  }

  const value: string[] = []
  for (const item of input) {
    if (typeof item !== 'string') {
      return { error: '食材リストの形式が不正です' }
    }
    const trimmed = item.trim()
    if (trimmed.length === 0) {
      continue
    }
    if (trimmed.length > MAX_INGREDIENT_LENGTH) {
      return { error: `食材名は${MAX_INGREDIENT_LENGTH}文字までにしてください` }
    }
    value.push(trimmed)
  }

  if (value.length === 0) {
    return { error: '食材リストが提供されていません' }
  }

  return { value }
}

// 履歴はマンネリ防止のヒントに過ぎないため、不正な要素は捨てて続行する
function parseHistory(input: unknown): HistoryItem[] {
  if (!Array.isArray(input)) {
    return []
  }

  const items: HistoryItem[] = []
  for (const entry of input.slice(0, MAX_HISTORY_ITEMS)) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as HistoryItem).date === 'string' &&
      typeof (entry as HistoryItem).main_dish === 'string'
    ) {
      const { date, main_dish } = entry as HistoryItem
      items.push({
        date: date.slice(0, MAX_INGREDIENT_LENGTH),
        main_dish: main_dish.slice(0, MAX_INGREDIENT_LENGTH),
      })
    }
  }
  return items
}

function handleError(error: unknown): NextResponse {
  console.error('Menu generation error:', error)

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
    { error: '献立の生成中にエラーが発生しました' },
    { status: 500 }
  )
}
