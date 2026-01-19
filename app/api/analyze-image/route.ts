import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function extractBase64Data(dataUrl: string): {
  base64Data: string;
  mediaType: MediaType;
} {
  // data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD... のような形式を解析
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!matches) {
    throw new Error("Invalid base64 data URL format");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  // サポートされているメディアタイプのみを許可
  const supportedMediaTypes: MediaType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!supportedMediaTypes.includes(mimeType as MediaType)) {
    throw new Error(
      `Unsupported media type: ${mimeType}. Supported types: ${supportedMediaTypes.join(", ")}`
    );
  }

  return {
    base64Data,
    mediaType: mimeType as MediaType,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, prompt } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Base64データとメディアタイプを抽出
    const { base64Data, mediaType } = extractBase64Data(imageData);

    const defaultPrompt =
      "この画像に写っている食材を全て特定し、日本語で一覧にしてください。";

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: prompt || defaultPrompt,
            },
          ],
        },
      ],
    });

    // Claude APIのレスポンスからテキストを抽出
    const textContent = response.content.find((block) => block.type === "text");
    const result = textContent && "text" in textContent ? textContent.text : "";

    return NextResponse.json({
      result,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Image analysis error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
