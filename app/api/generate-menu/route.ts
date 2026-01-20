import { NextRequest, NextResponse } from 'next/server'
import { openai, MODEL, GenerateMenuResponse } from '@/lib/openai'

// =============================================
// POST /api/generate-menu
// 食材と履歴から3日分の献立を生成する
// =============================================

interface HistoryItem {
  date: string
  main_dish: string
}

interface RequestBody {
  ingredients: string[] // 現在の食材リスト
  history?: HistoryItem[] // 過去の献立履歴（直近5件）
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    if (!body.ingredients || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: '食材リストが提供されていません' },
        { status: 400 }
      )
    }

    // 過去の献立履歴を整形
    const historyText =
      body.history && body.history.length > 0
        ? body.history
            .map((h) => `- ${h.date}: ${h.main_dish}`)
            .join('\n')
        : 'なし'

    // 食材リストを整形
    const ingredientsText = body.ingredients.join('、')

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `あなたは家庭料理の献立プランナーです。
与えられた食材を効率的に使い切る3日分の献立を考えてください。

必ず以下のJSON形式のみで回答してください。説明文は不要です。

{
  "days": [
    {
      "day": 1,
      "main_dish": "メイン料理名",
      "side_dish": "副菜名（複数可）",
      "instructions": "簡単な調理手順（2-3文）"
    },
    {
      "day": 2,
      "main_dish": "メイン料理名",
      "side_dish": "副菜名（複数可）",
      "instructions": "簡単な調理手順（2-3文）"
    },
    {
      "day": 3,
      "main_dish": "メイン料理名",
      "side_dish": "副菜名（複数可）",
      "instructions": "簡単な調理手順（2-3文）"
    }
  ],
  "shopping_list": ["足りない調味料や食材"]
}

重要なルール:
1. 提供された食材を3日間で使い切ること（フードロス削減）
2. 過去の履歴とメイン料理が被らないようにすること
3. 栄養バランスを考慮すること
4. 家庭で作りやすい料理を提案すること
5. 買い足しが必要な基本調味料（塩、醤油、油など）はshopping_listに記載`,
        },
        {
          role: 'user',
          content: `【現在の食材】
${ingredientsText}

【過去の献立履歴（直近5件）】
${historyText}

上記の食材を使って、3日分の献立を考えてください。
過去の履歴と被らないメニューにしてください。`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'AIからの応答がありませんでした' },
        { status: 500 }
      )
    }

    const result: GenerateMenuResponse = JSON.parse(content)

    // バリデーション: 3日分あるか確認
    if (!result.days || result.days.length !== 3) {
      return NextResponse.json(
        { error: '献立の生成に失敗しました。再度お試しください。' },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Menu generation error:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'AIの応答を解析できませんでした' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '献立の生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
