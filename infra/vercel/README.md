# Vercel デプロイ手順（フロントエンド apps/frontend）

## プロジェクト作成
1. Vercel にログインし、GitHub リポジトリ `parallel` をインポート
2. Framework: Vite + React (Build Command: `vite build`, Output: `dist` で自動検出)

## 環境変数設定
- Project Settings > Environment Variables で追加（Preview/Production）
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE` 例: `https://<your-worker-domain>` または ローカル検証時 `http://localhost:8787`

## デプロイ
- GitHub 連携で `main` に push すると自動デプロイ
- 手動トリガ: `vercel --prod`（ローカルで `vercel login` が必要）

## 注意
- Vite の VITE_ で始まる変数のみクライアントへ露出されます
- CORS/認証ヘッダは Worker 側で許可設定が必要です
