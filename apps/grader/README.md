# Grader (Cloud Run Jobs) - Java 17 + Maven

このコンテナは Supabase から `status=QUEUED` の submissions を最大 N 件取得し、ルーブリックに基づいて REST エンドポイント疎通チェックを行い、採点結果を Supabase Storage に保存、併せて submissions と grades テーブルを更新します。

- パス: apps/grader
- ランタイム: Java 17 (Maven, fat jar)

## 環境変数
- `SUPABASE_URL` (必須): 例 `https://<project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` (必須): Supabase Service Role Key
- `STORAGE_BUCKET` (必須): 採点結果 JSON を格納するバケット名 (例: `grades`)
- `BATCH_SIZE` (任意): 1 回に処理する submissions 件数 (デフォルト 5)。コマンドライン引数でも指定可能。
- `RUBRIC_PATH` (任意): ルーブリック YAML のパス。デフォルト `rubrics/sample_api.yaml`

## ルーブリック (YAML) 形式
apps/grader/rubrics/sample_api.yaml を参照:

```yaml
baseUrl: "http://localhost:8080"
tests:
  - name: "Health check"
    method: GET
    path: "/health"
    expectStatus: 200
    points: 10
  - name: "Create item"
    method: POST
    path: "/items"
    headers:
      Content-Type: application/json
    body: '{"name":"sample"}'
    expectStatus: 201
    points: 15
```

- baseUrl は学生のアプリが稼働しているベース URL
- tests の各ケースで method/path/期待ステータス/配点を定義

## ローカル実行
```bash
# 1) ビルド
cd apps/grader
mvn -DskipTests package

# 2) 実行 (環境変数を設定)
set SUPABASE_URL=https://<project>.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
set STORAGE_BUCKET=grades
set BATCH_SIZE=3
java -jar target/grader-0.1.0.jar  # または java -jar target/grader-0.1.0.jar 3
```

## Docker ビルド & 実行
```bash
# ビルド
cd apps/grader
docker build -t grader:local .

# 実行
docker run --rm \
  -e SUPABASE_URL="https://<project>.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
  -e STORAGE_BUCKET="grades" \
  -e BATCH_SIZE="5" \
  grader:local
```

## Cloud Run Jobs デプロイ例
```bash
# Artifact Registry 等に push する前提
PROJECT_ID=<your-gcp-project>
REGION=asia-northeast1
IMAGE=asia-northeast1-docker.pkg.dev/$PROJECT_ID/grader/grader:0.1.0

# ビルド & push (例: Cloud Build or local docker push)
# gcloud builds submit --tag "$IMAGE" apps/grader

# Cloud Run Jobs 作成
gcloud run jobs create grader-job \ 
  --image "$IMAGE" \ 
  --region "$REGION" \ 
  --set-env-vars SUPABASE_URL=https://<project>.supabase.co \ 
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \ 
  --set-env-vars STORAGE_BUCKET=grades \ 
  --set-env-vars BATCH_SIZE=5

# 実行
gcloud run jobs run grader-job --region "$REGION"

# 更新時
gcloud run jobs update grader-job --image "$IMAGE" --region "$REGION"
```

## 実装ノート
- Supabase REST(PostgREST) API を直接利用
  - submissions: GET /rest/v1/submissions?status=eq.QUEUED&order=createdAt.asc&limit=N
  - 更新: PATCH /rest/v1/submissions?id=eq.{id}
  - grades: POST /rest/v1/grades
  - Storage へのアップロード: POST /storage/v1/object/{bucket}/{path}
- 競合簡略化のため、採点開始時に `status=RUNNING` に更新します
- スコアはルーブリックの合計配点でカウントし、全テスト成功なら `PASSED`、いずれか失敗で `FAILED`
- フィードバックは `"<passed>/<total> tests passed"` を submissions.feedback に書き込み

## 留意点
- repoUrl の ZIP 取得はベストエフォート (GitHub repo URL の場合は main ブランチのアーカイブを推測)。MVP では ZIP ダウンロード失敗でも採点は続行されます。
- 本番用途では、回答アプリのデプロイ URL の取り出し方法 (例: 提出ZIP内の設定ファイル) を標準化することを推奨します。
