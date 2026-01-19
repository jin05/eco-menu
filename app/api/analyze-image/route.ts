import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL, AnalyzeImageResponse } from '@/lib/openai'

// =============================================
// POST /api/analyze-image
// 画像から食材を認識してリスト化する
// =============================================

interface RequestBody {
  image: string // Base64 data URL または 画像URL
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

    // 画像がBase64かURLかを判定
    const isBase64 = body.image.startsWith('data:')
    const imageContent: { type: 'image_url'; image_url: { url: string } } = {
      type: 'image_url',
      image_url: {
        url: isBase64 ? body.image : body.image,
      },
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `あなたは食材認識の専門家です。
画像に写っている食材を正確に特定し、日本語で回答してください。
必ず以下のJSON形式のみで回答してください。説明文は不要です。

{
  "ingredients": ["食材1", "食材2", "食材3"]
}

注意事項:
- 野菜、果物、肉、魚、調味料など、すべての食材を認識してください
- レシートの場合は、記載されている食品名を読み取ってください
- 不明確な場合は、最も可能性の高い食材名を記載してください
- 調理済み食品は、その名称で記載してください`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '画像内の食材を特定し、JSON形式で返してください。',
            },
            imageContent,
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'AIからの応答がありませんでした' },
        { status: 500 }
      )
    }

    const result: AnalyzeImageResponse = JSON.parse(content)

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
