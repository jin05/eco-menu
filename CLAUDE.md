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
- 構造化されたJSON形式で食材リストを取得
- 正確な食材名の日本語出力

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
- JSON出力形式を厳密に指定
- プレフィル技術（`{ "role": "assistant", "content": "{" }`）を使用してJSON形式を強制
- 履歴データを活用したパーソナライズされた提案

## 技術的な実装詳細

### 使用モデル

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-3-5-sonnet-20241022'
```

### プロンプトエンジニアリング

**献立生成のシステムプロンプト:**
```
あなたは優秀な料理研究家です。出力は必ずJSON形式のみを行ってください。

与えられた食材を効率的に使い切る3日分の献立を考えてください。

重要なルール:
1. 提供された食材を3日間で使い切ること（フードロス削減）
2. 過去の履歴とメイン料理が被らないようにすること
3. 栄養バランスを考慮すること
4. 家庭で作りやすい料理を提案すること
5. 買い足しが必要な基本調味料（塩、醤油、油など）はshopping_listに記載
```

### レスポンス形式

```typescript
interface GenerateMenuResponse {
  days: Array<{
    day: number
    main_dish: string
    side_dish: string
    instructions: string
  }>
  shopping_list: string[]
}
```

## 環境設定

### 必要な環境変数

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### パッケージのインストール

```bash
npm install @anthropic-ai/sdk
```

## プロジェクトの歴史

このプロジェクトは、当初OpenAI APIを使用していましたが、以下の理由によりAnthropic Claude APIに移行しました：

- より高度なビジョン機能
- 日本語処理の精度向上
- JSON出力の安定性
- プレフィル機能による出力制御の容易さ

移行は `2533ee5` コミットで完了しました。

## 関連ファイル

- `/app/api/analyze-image/route.ts` - 画像解析APIエンドポイント
- `/app/api/generate-menu/route.ts` - 献立生成APIエンドポイント
- `/lib/anthropic.ts` - Claude API設定とヘルパー関数
- `/app/page.tsx` - メインUIコンポーネント

## 使用上の注意

1. **APIキーの管理**: 環境変数にAPIキーを設定し、リポジトリにコミットしないでください
2. **レート制限**: Claude APIのレート制限に注意してください
3. **コスト管理**: Vision APIは通常のテキスト生成よりコストが高いため、使用量を監視してください
4. **エラーハンドリング**: ネットワークエラーやAPI制限エラーに対する適切なエラーハンドリングを実装しています

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
