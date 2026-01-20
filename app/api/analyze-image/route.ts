import { NextRequest, NextResponse } from 'next/server'
import {
  anthropic,
  MODEL,
  DEFAULT_MAX_TOKENS,
  AnalyzeImageResponse,
  parseBase64DataUrl,
} from '@/lib/anthropic'

// =============================================
// POST /api/analyze-image
// 画像から食材を認識してリスト化する
// =============================================

interface RequestBody {
  image: string // Base64 data URL (data:image/jpeg;base64,...)
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    if (!body.image) {
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

    const systemPrompt = `あなたは食材認識の専門家です。
画像に写っている食材を正確に特定し、日本語で回答してください。
必ず以下のJSON形式のみで回答してください。説明文は不要です。

{
  "ingredients": ["食材1", "食材2", "食材3"]
}

注意事項:
- 野菜、果物、肉、魚、調味料など、すべての食材を認識してください
- レシートの場合は、記載されている食品名を読み取ってください
- 不明確な場合は、最も可能性の高い食材名を記載してください
- 調理済み食品は、その名称で記載してください
- 必ずJSONのみを出力し、挨拶文やmarkdown記法（\`\`\`jsonなど）は含めないでください`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      system: systemPrompt,
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
              text: '画像内の食材を特定し、JSON形式で返してください。',
            },
          ],
        },
        {
          role: 'assistant',
          content: '{',
        },
      ],
    })

    // レスポンスからテキストを抽出
    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AIからの応答がありませんでした' },
        { status: 500 }
      )
    }

    // prefillで開始した '{' と応答を結合してJSONをパース
    const jsonString = '{' + textBlock.text
    const result: AnalyzeImageResponse = JSON.parse(jsonString)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Image analysis error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AIの応答を解析できませんでした' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '画像の解析中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
