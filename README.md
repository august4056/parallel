# Parallel

ParallelはSupabase、Cloudflare Workers、Vite + React、Cloud Runベースのオートグレーダを組み合わせた学習プラットフォーム向けMVPのモノレポです。講師と受講者が同じ基盤でダッシュボード、API、採点基盤、インフラ管理を扱えるよう最小限の構成をまとめています。

## ディレクトリ構成

- `apps/frontend` – 講師・受講者向けのReact + Viteダッシュボード。
- `apps/worker` – SupabaseをフロントするCloudflare Worker製REST API。
- `apps/grader` – Cloud Run JobsへデプロイするJava 17 / Maven製オートグレーダ。
- `packages/shared` – 共有TypeScript型とZodスキーマ。
- `infra` – Wrangler、Cloud Run Job、CIワークフローなどのデプロイ記述子。
- `supabase` – Supabase用のSQLスキーマ、RLSポリシー、シードデータ。

## セットアップ

npmワークスペースを使って依存関係をインストールします。

```bash
npm install
```

### フロントエンド (Vite)

```bash
npm run -w @launchpad/frontend dev
```

主な環境変数:

- `VITE_API_BASE_URL` – Cloudflare Worker APIのURL (既定値: `http://localhost:8787`)。

### Cloudflare Worker API

```bash
cd apps/worker
npm install
npm run dev
```

本番デプロイ前に`infra/wrangler.toml`へ必要なシークレットを設定してください。

### オートグレーダ

```bash
cd apps/grader
mvn clean package
```

ビルド後のシェーディング済みJARは`apps/grader/target/grader-0.1.0-SNAPSHOT-shaded.jar`に生成されます。付属のDockerfileを使ってCloud Run Jobs向けイメージをビルドしてください。

## Supabase

スキーマ、ポリシー、シードデータを適用します。

```bash
supabase db push supabase/schema.sql
supabase db push supabase/policies.sql
psql $SUPABASE_DB_URL -f supabase/seed.sql
```

Supabase Authのトークンには`app_metadata.role`クレームとして`STUDENT`または`INSTRUCTOR`を設定し、Worker側の認可判定に合わせてください。

## 継続的インテグレーション

GitHub Actionsワークフロー (`infra/github/workflows/ci.yml`) はnpm依存関係のインストール、フロントエンドのビルド、Workerと共有パッケージの型チェック、そしてオートグレーダのMavenテスト実行を行います。
