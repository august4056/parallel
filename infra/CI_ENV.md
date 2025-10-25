# CI / CD Secrets & Variables

このドキュメントは .github/workflows の ci.yml / deploy-main.yml が参照する Secrets/Vars を一覧化します。

## 共通
- なし（Node 20 / Ubuntu ランナー使用）

## Cloudflare Worker (deploy-main.yml jobs.worker)
- secrets.CLOUDFLARE_API_TOKEN: Cloudflare API Token（`Workers R2:Edit`/`Workers Scripts:Edit` 等、publish に必要な権限）
- secrets.CLOUDFLARE_ACCOUNT_ID: Cloudflare アカウントID
  - 代替: `wrangler.toml` に account_id を記載している場合は `--account-id` 省略可

## Vercel Frontend (deploy-main.yml jobs.frontend)
- secrets.VERCEL_TOKEN: Personal token（プロジェクトへの権限付与済み）
- secrets.VERCEL_PROJECT_ID: Vercel Project ID（プロジェクト設定画面に表示）
- secrets.VERCEL_ORG_ID: Vercel Org ID（任意。`vercel pull` のメタ用）
- 環境変数（Vercel側に設定）
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_API_BASE

## Google Cloud Run Jobs / Artifact Registry (deploy-main.yml jobs.grader)
- secrets.GCP_PROJECT_ID: GCP プロジェクトID
- secrets.GCP_REGION: 例 `asia-northeast1`
- secrets.GAR_REPOSITORY: Artifact Registry リポジトリ名（例: `grader`）
- secrets.CLOUD_RUN_JOB_NAME: 更新対象の Cloud Run Job 名（例: `grader-job`）
- secrets.GCP_SA_KEY: サービスアカウント JSON キー（`roles/run.admin`, `roles/artifactregistry.admin`, `roles/cloudbuild.builds.editor` など必要最小限）
  - 推奨: Workload Identity Federation（`google-github-actions/auth@v2`）でキーレス運用

## 参考: 事前準備
- Artifact Registry: infra/cloud-run/README.md を参照
- wrangler.toml: `infra/wrangler.toml` の `name`/`main`/`compatibility_date`/`account_id` を確認
- Vercel: プロジェクト作成と環境変数設定（infra/vercel/README.md）
- Supabase: Auth 設定と Service Role Key / JWKS の取り扱い（infra/supabase/DEPLOY.md）
