# Supabase SQL Assets

## ローカルCLIでの適用手順
1. Supabase CLI を最新版に更新し、`.env` などで `SUPABASE_ACCESS_TOKEN` と `PROJECT_REF` を設定しておきます。
2. ローカル開発用に Supabase を起動します。
   ```bash
   supabase start
   ```
3. 生成したマイグレーションを適用します。ローカルホストのDBを使う場合は以下が簡単です。
   ```bash
   supabase db reset --non-interactive
   ```
   既存データを残したい場合は `supabase db push` を使って差分マイグレーションを適用してください。
4. シードデータを投入します。CLI 0.24 以降であれば `--seed-file` フラグが使えます。
   ```bash
   supabase db seed --seed-file supabase/seed/seed.sql
   ```
   古いバージョンの場合は `psql` 経由で適用します。
   ```bash
   psql "$(supabase status --json | jq -r '.services.db.connectionString')" -f supabase/seed/seed.sql
   ```

## RLSの考え方
- すべてのテーブルで Row Level Security を有効化し、`auth.uid()` と `auth.jwt()` のクレームを基に判定しています。
- `users` は本人確認用途に限定し、`auth.uid() = id` のユーザーのみ `select` を許可しています。
- `assignments` は全員が参照可能ですが、作成・更新・削除は `role = INSTRUCTOR` かつ `created_by = auth.uid()` の行だけに制限しています。
- `submissions` は学生が自分の提出のみ参照・更新・作成でき、講師は自分の課題に紐づく提出に限って閲覧・更新できます。
- `grades` も提出と同じ判定ロジックで、学生は自分の提出に紐づく成績のみ参照可能、講師は自分の課題に対する成績を閲覧・採点（作成・更新・削除）できます。
- これにより、学生はプライベートな提出物と成績を保護され、講師は担当課題の進捗だけを俯瞰できるようになっています。
