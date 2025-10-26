# Cloudflare Workers デプロイ手順

このプロジェクトでは `infra/wrangler.toml` をベースに Cloudflare Workers (apps/worker) をデプロイします。

## wrangler.toml の構成
- `name`: Worker の名前
- `main`: エントリポイント（例: `dist/index.js`）
- `compatibility_date`: 実行互換日付
- `account_id`: Cloudflare アカウントID
- `routes` or `workers_dev`: ルーティング設定
- `vars`: 環境変数（必要に応じて Secret へ）

`infra/wrangler.toml` を参考に、apps/worker のビルド出力に合わせて `main` を変更してください。

## 初回ログイン
```bash
# ローカルで一度だけ
npx wrangler login
```

## Secret の設定（例）
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_JWT_AUDIENCE
npx wrangler secret put SUPABASE_JWT_ISSUER
npx wrangler secret put SUPABASE_JWT_JWKS
```

## デプロイ
```bash
# apps/worker ディレクトリでビルド
npm run -w @launchpad/worker build

# デプロイ
npx wrangler publish -c infra/wrangler.toml
```

## ローカル開発
```bash
npx wrangler dev -c infra/wrangler.toml
```
