import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Assignment } from '@launchpad/shared';
import type { InstructorSubmission } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

export const InstructorDashboard = () => {
  const { role } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    dueAt: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [regradeMessage, setRegradeMessage] = useState<string | null>(null);

  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => api!.listAssignments(),
    enabled: Boolean(api)
  });

  useEffect(() => {
    if (!selectedAssignmentId && assignmentsQuery.data?.length) {
      setSelectedAssignmentId(assignmentsQuery.data[0].id);
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const submissionsQuery = useQuery<InstructorSubmission[]>({
    queryKey: ['instructor', 'submissions', selectedAssignmentId],
    queryFn: () => api!.listAssignmentSubmissions(selectedAssignmentId),
    enabled: Boolean(api && selectedAssignmentId)
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!api) {
        throw new Error('APIクライアントが初期化されていません');
      }
      setFormError(null);
      await api.createAssignment({
        title: formState.title.trim(),
        description: formState.description.trim(),
        dueAt: new Date(formState.dueAt).toISOString()
      });
    },
    onSuccess: () => {
      setFormState({ title: '', description: '', dueAt: '' });
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof Error ? error.message : '課題の作成に失敗しました');
    }
  });

  const handleCreateAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title || !formState.dueAt) {
      setFormError('タイトルと締切日時は必須です');
      return;
    }
    createAssignmentMutation.mutate();
  };

  const regradeMutation = useMutation({
    mutationFn: (submissionId: string) => api!.requestRegrade(submissionId),
    onSuccess: (data) => {
      setRegradeMessage(`再採点を受け付けました (${new Date(data.requestedAt).toLocaleTimeString('ja-JP')})`);
    },
    onError: (error: unknown) => {
      setRegradeMessage(error instanceof Error ? error.message : '再採点を要求できませんでした');
    }
  });

  if (role !== 'INSTRUCTOR') {
    return (
      <div className="card">
        <h1 className="text-lg font-semibold text-slate-900">講師専用画面</h1>
        <p className="mt-2 text-sm text-slate-600">
          このセクションは講師アカウントのみアクセスできます。権限が必要な場合は管理者へお問い合わせください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-semibold text-brand-600">講師ビュー</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">課題と提出の管理</h1>
        <p className="text-sm text-slate-600">
          新しい課題を作成し、学生の提出状況を確認および再採点リクエストを送信できます。
        </p>
      </header>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">課題を作成</h2>
          {createAssignmentMutation.isSuccess ? (
            <span className="text-sm text-brand-700">作成しました</span>
          ) : null}
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateAssignment}>
          <label className="text-sm font-medium text-slate-700">
            タイトル
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
              required
              className="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            締切日時
            <input
              type="datetime-local"
              value={formState.dueAt}
              onChange={(event) => setFormState((state) => ({ ...state, dueAt: event.target.value }))}
              required
              className="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </label>
          <label className="md:col-span-2 text-sm font-medium text-slate-700">
            課題説明
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((state) => ({ ...state, description: event.target.value }))}
              rows={4}
              className="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              className="button-primary"
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending ? '作成中...' : '課題を作成'}
            </button>
            {formError ? (
              <p className="text-sm text-rose-600" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">提出一覧</h2>
            <p className="text-sm text-slate-600">課題ごとの提出状況を確認できます。</p>
          </div>
          <select
            value={selectedAssignmentId}
            onChange={(event) => setSelectedAssignmentId(event.target.value)}
            className="rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            {assignmentsQuery.data?.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
        </div>
        {submissionsQuery.isLoading ? (
          <p className="text-sm text-slate-600">提出を読み込み中です...</p>
        ) : null}
        {submissionsQuery.isError ? (
          <p className="text-sm text-rose-600" role="alert">
            {(submissionsQuery.error as Error).message}
          </p>
        ) : null}
        {regradeMessage ? (
          <p className="text-sm text-brand-700">{regradeMessage}</p>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="hidden grid-cols-12 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 md:grid">
            <div className="col-span-3">学生</div>
            <div className="col-span-3">リポジトリ</div>
            <div className="col-span-2">提出日時</div>
            <div className="col-span-2">ステータス</div>
            <div className="col-span-2">操作</div>
          </div>
          <ul className="divide-y divide-slate-200">
            {submissionsQuery.data?.map((submission) => (
              <li key={submission.id} className="grid gap-2 px-4 py-3 md:grid-cols-12 md:items-center">
                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-slate-900">{submission.student.email}</p>
                  <p className="text-xs text-slate-500">ID: {submission.student.id}</p>
                </div>
                <div className="md:col-span-3">
                  <a href={submission.repoUrl} target="_blank" rel="noreferrer" className="break-all text-sm">
                    {submission.repoUrl}
                  </a>
                </div>
                <p className="md:col-span-2 text-sm text-slate-600">
                  {new Date(submission.createdAt).toLocaleString('ja-JP')}
                </p>
                <p className="md:col-span-2 text-sm font-medium text-slate-700">{submission.status}</p>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="button-secondary w-full text-sm"
                    onClick={() => regradeMutation.mutate(submission.id)}
                    disabled={regradeMutation.isPending}
                  >
                    {regradeMutation.isPending ? '要求中...' : '再採点をリクエスト'}
                  </button>
                </div>
              </li>
            ))}
            {!submissionsQuery.isLoading && (submissionsQuery.data?.length ?? 0) === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-600">
                まだ提出がありません。
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
};
