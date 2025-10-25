# Cloud Run Jobs / Artifact Registry / Scheduler

このディレクトリは最小限のドキュメント指向 IaC（手順中心）です。

## 1) Artifact Registry の作成
```bash
PROJECT_ID=<your-gcp-project>
REGION=asia-northeast1
REPO=grader

gcloud services enable artifactregistry.googleapis.com --project "$PROJECT_ID"
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Parallel grader images" \
  --project "$PROJECT_ID"
```

## 2) コンテナビルド＆プッシュ
- ローカル Docker or Cloud Build のどちらでも可

(Cloud Build)
```bash
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/grader:0.1.0"
# apps/grader ディレクトリから
gcloud builds submit --tag "$IMAGE" apps/grader --project "$PROJECT_ID"
```

(ローカル Docker)
```bash
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/grader:0.1.0"
cd apps/grader
docker build -t "$IMAGE" .
gcloud auth configure-docker "$REGION-docker.pkg.dev"
docker push "$IMAGE"
```

GitHub Actions (サンプル)
```yaml
# .github/workflows/grader-build.yml
name: Build & Push Grader
on:
  push:
    paths:
      - 'apps/grader/**'
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGION }}-docker.pkg.dev
          username: oauth2accesstoken
          password: ${{ steps.auth.outputs.access_token }}
      - name: Build & Push
        run: |
          IMAGE="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/grader:${{ github.sha }}"
          docker build -t "$IMAGE" apps/grader
          docker push "$IMAGE"
```

## 3) Cloud Run Jobs の作成
- gcloud beta を利用（GA でも可）
```bash
PROJECT_ID=<your-gcp-project>
REGION=asia-northeast1
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/grader/grader:0.1.0"
JOB=grader-job

gcloud services enable run.googleapis.com --project "$PROJECT_ID"

gcloud beta run jobs create "$JOB" \
  --image "$IMAGE" \
  --region "$REGION" \
  --set-env-vars SUPABASE_URL=https://<project>.supabase.co \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
  --set-env-vars STORAGE_BUCKET=grades \
  --set-env-vars BATCH_SIZE=5

# 手動実行
gcloud beta run jobs run "$JOB" --region "$REGION" --project "$PROJECT_ID"

# 更新
gcloud beta run jobs update "$JOB" --image "$IMAGE" --region "$REGION"
```

## 4) Cloud Scheduler による定期実行（5分おき）
- 方式A: HTTP で Cloud Run Jobs 実行 API を叩く（OIDC付与）
```bash
SVC_ACCOUNT=<scheduler-invoker@${PROJECT_ID}.iam.gserviceaccount.com>
JOB_URL="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/$JOB:run"

# 権限（Cloud Run Job Runner 相当の権限が必要）
gcloud iam service-accounts create scheduler-invoker --project "$PROJECT_ID" || true
# 必要に応じて roles/run.invoker や Cloud Run Jobs 実行に必要な権限を付与

gcloud scheduler jobs create http run-grader-every-5min \
  --schedule="*/5 * * * *" \
  --http-method=POST \
  --uri="$JOB_URL" \
  --oauth-service-account-email="$SVC_ACCOUNT" \
  --oauth-token-audience="https://$REGION-run.googleapis.com/"
```

- 方式B: Pub/Sub 経由（例: Cloud Function/Cloud Run がトピック購読し、ジョブ実行）
```bash
TOPIC=run-grader-trigger

gcloud pubsub topics create "$TOPIC"

gcloud scheduler jobs create pubsub run-grader-pubsub \
  --schedule="*/5 * * * *" \
  --topic="$TOPIC" \
  --message-body="{\"action\":\"run-grader\"}"

# サブスクライバ（例）側でメッセージを受信し、
# gcloud run jobs run "$JOB" --region "$REGION" を呼び出す実装を用意
```
