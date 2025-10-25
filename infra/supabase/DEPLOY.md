# Supabase デプロイ/設定ガイド

本プロジェクトで必要となる Supabase 側の設定と秘密情報の取り扱い指針を示します。

## 1) Auth / JWKS
- Supabase Auth を有効化し、Email (Magic Link) と GitHub OAuth を設定
- Redirect URLs にフロントエンドの URL を追加（例: `http://localhost:5173`, 本番の Vercel ドメイン）
- JWKS は Worker 側が JWT 検証に利用する場合があります
  - 取得例: `https://<project>.supabase.co/auth/v1/jwks`
  - Worker の環境変数に `SUPABASE_JWT_JWKS` として保存する等（長いので Secret 推奨）

## 2) Service Role Key の扱い
- `SUPABASE_SERVICE_ROLE_KEY` はサーバーサイド専用（Cloud Run Jobs など）
- クライアント（Vercel のフロント）には絶対に露出しないようにしてください
- Cloud Run Jobs（apps/grader）は Service Role Key で PostgREST と Storage を操作

## 3) .env への流し込み
- フロントエンド（apps/frontend/.env）:
  - `VITE_SUPABASE_URL=https://<project>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon_key>`
  - `VITE_API_BASE=<worker base url>`
- Worker（apps/worker/.env など任意の管理方法）:
  - `SUPABASE_URL=https://<project>.supabase.co`
  - `SUPABASE_JWT_ISSUER=https://<project>.supabase.co/auth/v1`
  - `SUPABASE_JWT_AUDIENCE=supabase`
  - `SUPABASE_JWT_JWKS=<jwks json or url>`
- Grader（Cloud Run Jobs の環境変数）:
  - `SUPABASE_URL=https://<project>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=<service_role_key>`
  - `STORAGE_BUCKET=grades`
  - `BATCH_SIZE=5`（任意）

## 4) DB / Storage 準備
- Storage に `grades` バケット（読み取りは認証ユーザーのみ等、適切なポリシーを設定）
- `submissions` / `grades` テーブル定義と RLS ルールは `supabase/migrations` を参照

## 5) セキュリティ注意点
- すべての秘密は Secret マネージャー or プラットフォームの Secret に保存（Git に置かない）
- CORS 設定は Worker/API 側で最小限に制限
- RLS は厳格に（学生は自分のデータのみ、講師は必要な範囲のみ）
