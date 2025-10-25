# @launchpad/shared

TypeScript の型と Zod スキーマを提供する共有パッケージです。フロントエンド（apps/frontend）と Cloudflare Worker（apps/worker）から利用できます。

## 提供内容
- 型: `User`, `Assignment`, `Submission`, `Grade` など
- スキーマ: `userSchema`, `assignmentSchema`, `submissionSchema`, `gradeSchema`
- 入力/応答スキーマ: `createSubmissionInputSchema` (別名: `submissionCreateInputSchema`), `createAssignmentInputSchema`, `gradeResponseSchema`

## インストール / ビルド
ワークスペース配下でビルドします。
```bash
npm run -w @launchpad/shared build
```

## 使い方
```ts
// Type と Schema の import 例
import { assignmentSchema, type Assignment } from '@launchpad/shared';

const data = await fetch('/api/assignments').then(r => r.json());
const assignments: Assignment[] = assignmentSchema.array().parse(data);
```

入力スキーマの例:
```ts
import { createSubmissionInputSchema, type CreateSubmissionInput } from '@launchpad/shared';

const payload: CreateSubmissionInput = createSubmissionInputSchema.parse({
  assignmentId: 'uuid-...',
  repoUrl: 'https://github.com/user/repo'
});
```

## パス解決（Worker/Frontend 双方からの import）
- フロント: `apps/frontend/tsconfig.json` に `@launchpad/shared` の `paths` を設定済み
- Worker: `apps/worker/tsconfig.json` に同様の `paths`/`references` を設定（リポジトリでは既に追加）

## 出力
- ESM: `dist/index.js`
- 型定義: `dist/index.d.ts`
- exports: ルート (`@launchpad/shared`), `@launchpad/shared/schemas`
