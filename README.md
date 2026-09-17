# AIエコ献立 🥬

冷蔵庫の中身やレシートを撮影すると、AIが食材を認識し、それらを使い切る3日分の献立を提案するアプリケーションです。フードロス削減を目的としています。

## できること

1. **食材を撮影** — 冷蔵庫の写真やレシートをアップロードすると、Claudeのビジョン機能が食材を自動認識します
2. **リストを編集** — 認識結果を手で追加・編集・削除できます。撮影せず手入力だけでも使えます
3. **献立を生成** — 食材を使い切る3日分の献立（主菜・副菜・手順）と、買い足しが必要なものの一覧が出ます
4. **履歴を反映** — 採用した献立は保存され、次回の提案で主菜が被らないよう考慮されます

ログインすると履歴はSupabaseに保存され端末をまたいで使えます。未ログインでも、この端末のローカル保存のみで一通り動作します。

## 技術スタック

| 領域 | 使用技術 |
|---|---|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| データベース / 認証 | Supabase (Postgres + Auth, RLS有効) |
| バリデーション | Zod |
| テスト | Vitest |

## セットアップ

### 前提

- Node.js 22 以上
- Anthropic APIキー（[Anthropic Console](https://console.anthropic.com/settings/keys) で取得）
- Supabaseプロジェクト（任意。無くてもローカル保存モードで動作します）

### 手順

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定
cp .env.local.example .env.local
# .env.local を開いて各キーを設定する

# 3. Supabaseのスキーマ適用（Supabaseを使う場合のみ）
#    Supabase Dashboard > SQL Editor で以下を実行
#    supabase/migrations/001_initial_schema.sql

# 4. 開発サーバーの起動
npm run dev
```

http://localhost:3000 を開きます。

### 環境変数

| 変数名 | 必須 | 用途 | 取得先 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | 画像解析・献立生成 | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase接続先 | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Supabase公開鍵（RLSで保護） | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | — | RLSバイパスが必要な操作用 | 同上 |

`ANTHROPIC_API_KEY` が未設定の場合、APIルートは明示的なエラーを返します。
Supabase系が未設定の場合、アプリはローカル保存モードで動作し、ログイン機能は無効になります。

**注意:** `SUPABASE_SERVICE_ROLE_KEY` はRLSをバイパスします。クライアントに露出させないでください。

## 開発コマンド

```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run start      # 本番サーバー
npm run lint       # ESLint
npm run typecheck  # 型チェック
npm test           # テスト実行
npm run test:watch # テストのウォッチ実行
```

CIではPRごとに lint / typecheck / test / build が実行されます（`.github/workflows/ci.yml`）。

## ディレクトリ構成

```
app/
  api/analyze-image/   画像から食材を認識するAPIルート
  api/generate-menu/   献立を生成するAPIルート
  auth/callback/       マジックリンクのコールバック
  login/               ログインページ
  page.tsx             メインUI
components/            UIコンポーネント
hooks/                 献立履歴のカスタムフック
lib/
  anthropic.ts         Claude API設定とZodスキーマ
  image.ts             クライアント側の画像リサイズ
  rate-limit.ts        APIルートのレート制限
  supabase*.ts         Supabaseクライアント
supabase/migrations/   データベーススキーマ
```

Claude APIとの連携方針については [CLAUDE.md](./CLAUDE.md) を参照してください。

## 制限事項

- レート制限はプロセスメモリ上で管理しているため、サーバーレスで複数インスタンスにスケールするとインスタンスごとの制限になります。厳密な制限が必要な場合は外部ストアへの置き換えが必要です
- 画像は送信前にクライアント側で長辺1568pxへ縮小されます。サーバー側でもデコード後5MBの上限を設けています
