import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MenuRequest {
  ingredients: string[];
  preferences?: {
    servings?: number;
    cuisine?: string;
    restrictions?: string[];
  };
}

interface Recipe {
  name: string;
  description: string;
  ingredients: {
    name: string;
    amount: string;
  }[];
  steps: string[];
  cookingTime: string;
  difficulty: string;
}

interface MenuResponse {
  recipes: Recipe[];
}

export async function POST(request: NextRequest) {
  try {
    const body: MenuRequest = await request.json();
    const { ingredients, preferences } = body;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "At least one ingredient is required" },
        { status: 400 }
      );
    }

    const servings = preferences?.servings || 2;
    const cuisine = preferences?.cuisine || "和食";
    const restrictions = preferences?.restrictions || [];

    const restrictionText =
      restrictions.length > 0
        ? `\n- 食事制限: ${restrictions.join(", ")}`
        : "";

    const userPrompt = `以下の食材を使って、${servings}人分の${cuisine}の献立を3品提案してください。

## 使用可能な食材
${ingredients.map((i) => `- ${i}`).join("\n")}
${restrictionText}

## 出力形式
以下のJSON形式で出力してください:
{
  "recipes": [
    {
      "name": "料理名",
      "description": "料理の簡単な説明",
      "ingredients": [
        { "name": "食材名", "amount": "分量" }
      ],
      "steps": ["手順1", "手順2", "..."],
      "cookingTime": "調理時間（例: 約30分）",
      "difficulty": "難易度（簡単/普通/難しい）"
    }
  ]
}

必ずJSONのみを出力し、挨拶文やmarkdown記法（\`\`\`jsonなど）は含めないでください。`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system:
        "あなたは優秀な料理研究家です。出力は必ずJSON形式のみを行ってください。余計な説明や装飾は一切不要です。",
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
        {
          // Prefill: Assistantの最初の出力を { に固定してJSON出力を確実にする
          role: "assistant",
          content: "{",
        },
      ],
    });

    // Claude APIのレスポンスからテキストを抽出
    const textContent = response.content.find((block) => block.type === "text");
    const rawText =
      textContent && "text" in textContent ? textContent.text : "";

    // Prefillで `{` を使ったので、先頭に `{` を追加してJSONを完成させる
    const jsonString = "{" + rawText;

    // JSONをパースして検証
    let menuData: MenuResponse;
    try {
      menuData = JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse JSON response:", jsonString);
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...menuData,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Menu generation error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
