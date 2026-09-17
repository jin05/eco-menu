# Claude AI Integration

このプロジェクトでは、Anthropic Claude APIを活用して、食材を無駄なく活用する献立プランニング機能を提供しています。

## 概要

eco-menuは、AIを活用した献立プランニングアプリケーションです。ユーザーが冷蔵庫の中身やレシートを撮影すると、Claude APIが食材を認識し、それらを効率的に使い切る3日分の献立を自動生成します。

## Claude APIの使用機能

### 1. 画像解析機能 (Vision API)

**エンドポイント:** `/api/analyze-image`

Claude APIのビジョン機能を使用して、ユーザーがアップロードした画像から食材を自動認識します。

**主な用途:**
- 冷蔵庫内の食材の認識
- レシートからの食材リスト抽出
- 食材の種類と名称の特定

**実装の特徴:**
- 画像データをbase64形式で送信
- structured outputs（`output_config.format`）で食材リストのJSONスキーマを強制
- 正確な食材名の日本語出力
- 送信前にクライアント側で長辺1568pxへリサイズし、APIコストを抑制（`lib/image.ts`）

### 2. 献立生成機能 (Text Generation)

**エンドポイント:** `/api/generate-menu`

Claude APIを使用して、提供された食材リストと過去の献立履歴を基に、3日分の献立を生成します。

**主な用途:**
- 食材を効率的に使い切る献立の提案
- 過去の履歴と被らないメニュー生成（マンネリ防止）
- 栄養バランスを考慮した料理の組み合わせ
- 必要な追加調味料のリストアップ

**実装の特徴:**
- システムプロンプトで料理研究家のペルソナを設定
- structured outputs（`output_config.format`）でJSON形式を強制
- Zodスキーマにより出力を実行時バリデーション
- 履歴データを活用したパーソナライズされた提案

## 技術的な実装詳細

### 使用モデル

```typescript
import Anthropic from '@anthropic-ai/sdk'

// APIキー未設定を早期に検知するため、クライアントは関数経由で生成する
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new MissingApiKeyError()
  return new Anthropic({ apiKey })
}

export const MODEL = 'claude-opus-5'
```

### structured outputs

JSON出力の強制にはassistant prefillではなく `output_config.format` を使用する。
prefill（`{ "role": "assistant", "content": "{" }`）は現行世代のモデルでは
400エラーになるため使用しないこと。

```typescript
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const response = await client.messages.parse({
  model: MODEL,
  max_tokens: 8192,
  system: systemPrompt,
  output_config: { format: zodOutputFormat(GenerateMenuSchema) },
  messages: [{ role: 'user', content: userPrompt }],
})

// パースに失敗すると null になるため、必ずガードする
if (!response.parsed_output) { /* エラー処理 */ }
```

### プロンプトエンジニアリング

**献立生成のシステムプロンプト:**
```
あなたは優秀な料理研究家です。

与えられた食材を効率的に使い切る3日分の献立を考えてください。

重要なルール:
1. 提供された食材を3日間で使い切ること（フードロス削減）
2. 過去の履歴とメイン料理が被らないようにすること
3. 栄養バランスを考慮すること
4. 家庭で作りやすい料理を提案すること
5. 買い足しが必要な基本調味料（塩、醤油、油など）はshopping_listに記載
6. daysは必ず3件、dayは1から3の連番にすること
7. instructionsは簡単な調理手順を2-3文で記載すること
```

出力形式の指示はstructured outputsのスキーマが担うため、プロンプトには
JSONの形を書かない。プロンプトには「何を作るか」のルールだけを書く。

### レスポンス形式

型は `lib/anthropic.ts` のZodスキーマから導出される（スキーマが唯一の定義）。

```typescript
export const GenerateMenuSchema = z.object({
  days: z.array(DayMenuSchema),
  shopping_list: z.array(z.string()),
})

export type GenerateMenuResponse = z.infer<typeof GenerateMenuSchema>
```

クライアントコンポーネントからこれらの型を使う場合は、SDKがクライアント
バンドルに混入しないよう `import type` を使うこと。

## 環境設定

### 必要な環境変数

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### パッケージのインストール

```bash
npm install @anthropic-ai/sdk zod
```

## プロジェクトの歴史

このプロジェクトは、当初OpenAI APIを使用していましたが、以下の理由によりAnthropic Claude APIに移行しました：

- より高度なビジョン機能
- 日本語処理の精度向上
- JSON出力の安定性

移行は `2533ee5` コミットで完了しました。ただしこのコミットで削除された
`lib/openai.ts` への参照が3ファイルに残っておりビルドが壊れていたため、
後続の対応で修正済み。同時にモデルを現行世代へ更新し、当時使用していた
prefillによるJSON強制はstructured outputsへ置き換えた。

## 関連ファイル

- `/app/api/analyze-image/route.ts` - 画像解析APIエンドポイント
- `/app/api/generate-menu/route.ts` - 献立生成APIエンドポイント
- `/lib/anthropic.ts` - Claude API設定、Zodスキーマ、ヘルパー関数
- `/lib/image.ts` - クライアント側の画像リサイズ・圧縮
- `/lib/rate-limit.ts` - APIルートのレート制限
- `/app/page.tsx` - メインUIコンポーネント

## 使用上の注意

1. **APIキーの管理**: 環境変数にAPIキーを設定し、リポジトリにコミットしないでください
2. **レート制限**: Claude API側のレート制限に加え、APIルート側でもIP単位の制限をかけています（`lib/rate-limit.ts`）。インメモリ実装のため、複数インスタンスにスケールする場合は外部ストアへの置き換えが必要です
3. **コスト管理**: Vision APIは通常のテキスト生成よりコストが高いため、`/api/analyze-image` の制限は他より厳しく設定しています
4. **エラーハンドリング**: `MissingApiKeyError` / `RateLimitError` / `AuthenticationError` を区別して扱い、クライアントには内部情報を返さないようにしています

## 今後の改善案

- [ ] ストリーミングレスポンスの実装による応答速度の向上
- [ ] キャッシング機能の活用によるコスト削減
- [ ] より高度な食材認識（量や状態の判定）
- [ ] アレルギー情報や食事制限への対応
- [ ] 複数の献立案の同時生成と比較機能

## 参考リンク

- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [Claude Vision API Guide](https://docs.anthropic.com/claude/docs/vision)
- [Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
