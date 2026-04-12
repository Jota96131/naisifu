# naishifu

Supabase認証付きの学習記録アプリ（Next.js + TypeScript）

## 環境構築

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を記載：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

## 環境変数の対応表

| 環境変数 | ローカル（.env.local） | CI/CD（GitHub Secrets） |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`に記載 | `NEXT_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`に記載 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | ビルド |
| `npm run lint` | Lintチェック |
| `npm test` | テスト実行 |
| `npm run test:watch` | テストをwatch実行 |

## CI/CD

GitHub Actionsで以下のパイプラインが動く：

```
lint → test → build → Vercelが自動デプロイ
```

mainブランチへのpushで自動実行される。

## テスト

| テストファイル | 内容 |
|---|---|
| `__tests__/login.test.tsx` | ログインページの表示・正常系・異常系 |
| `__tests__/middleware.test.ts` | 未認証リダイレクト |
| `__tests__/supabase.test.ts` | Supabase接続・テーブル取得 |
