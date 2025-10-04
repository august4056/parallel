# Parallel Frontend

Supabase 認証と Cloudflare Worker API を利用した学生・講師向けの課題管理ポータルです。Vite + React + TypeScript をベースに、状態管理に React Query、UI に Tailwind CSS を採用しています。

## セットアップ

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. 環境変数を設定します。`.env.example` を `.env` にコピーして値を入れてください。
   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_API_BASE=
   ```
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: Supabase プロジェクトの URL と anon key。
   - `VITE_API_BASE`: `apps/worker` が提供する API のベース URL（例: `http://localhost:8787`）。

## 利用方法

- 開発サーバー: `npm run dev --workspace @launchpad/frontend`
- 型チェック: `npm run typecheck --workspace @launchpad/frontend`
- ビルド: `npm run build --workspace @launchpad/frontend`

## 機能概要

- **認証**: Supabase Auth（メールリンク / GitHub OAuth）によるログイン・ログアウト。
- **学生画面**:
  - 課題一覧表示
  - リポジトリ URL 提出フォーム
  - 自分の提出履歴一覧
  - 採点結果詳細画面
- **講師画面**:
  - 課題の新規作成
  - 課題別の提出一覧
  - 再採点リクエスト（ダミーボタン）
- **API クライアント**: `src/lib/api.ts` で `apps/worker` のエンドポイントを呼び出し、Zod でレスポンスを検証。
- **状態管理**: React Query による API キャッシュとミューテーション管理。
- **UI**: Tailwind CSS + アクセシビリティに配慮したフォーム / テーブル構造。

## ディレクトリ構成

- `src/App.tsx`: ルーティングと画面切り替え。
- `src/pages/StudentDashboard.tsx`: 学生向けダッシュボード。
- `src/pages/StudentSubmissionDetail.tsx`: 学生の採点結果詳細。
- `src/pages/InstructorDashboard.tsx`: 講師向けダッシュボード。
- `src/lib/api.ts`: Supabase トークンを用いた API クライアント。
- `src/providers/SupabaseProvider.tsx`: 認証状態の管理とコンテキスト。

## 備考

- Supabase プロジェクトのユーザーメタデータに `role`（`STUDENT` または `INSTRUCTOR`）を設定すると、対応する画面が表示されます。
- API のレスポンススキーマは `packages/shared` の Zod 定義を使用しています。
