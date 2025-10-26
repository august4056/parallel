import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Assignment, Submission } from '@launchpad/shared';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

const submissionStatusLabel: Record<Submission['status'], string> = {
  QUEUED: 'キュー待ち',
  RUNNING: '実行中',
  PASSED: '合格',
  FAILED: '失敗'
};

export const StudentDashboard = () => {
  const api = useApi();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => api!.listAssignments(),
    enabled: Boolean(api)
  });

  const submissionsQuery = useQuery<Submission[]>({
    queryKey: ['student', 'submissions'],
    queryFn: () => api!.listStudentSubmissions(),
    enabled: Boolean(api)
  });

  useEffect(() => {
    if (!selectedAssignmentId && assignmentsQuery.data?.length) {
      setSelectedAssignmentId(assignmentsQuery.data[0].id);
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const filteredSubmissions = useMemo(() => {
    if (!selectedAssignmentId) {
      return submissionsQuery.data ?? [];
    }
    return (submissionsQuery.data ?? []).filter(
      (submission) => submission.assignmentId === selectedAssignmentId
    );
  }, [selectedAssignmentId, submissionsQuery.data]);

  const createSubmission = useMutation({
    mutationFn: () => {
      if (!api || !selectedAssignmentId) {
        throw new Error('課題が選択されていません');
      }
      setErrorMessage(null);
      return api.createSubmission({
        assignmentId: selectedAssignmentId,
        repoUrl: repoUrl.trim()
      });
    },
    onSuccess: () => {
      setRepoUrl('');
      void queryClient.invalidateQueries({ queryKey: ['student', 'submissions'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : '提出に失敗しました');
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!repoUrl.trim()) {
      setErrorMessage('リポジトリURLを入力してください');
      return;
    }
    createSubmission.mutate();
  };

  return (
    <div className="space-y-10">
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Todo API 課題 (MVP)</h2>
        <p className="text-sm text-slate-600">以下のエンドポイントを実装して提出してください。採点はHTTPステータス中心で行います。</p>
        <ul className="list-disc pl-6 text-sm text-slate-700">
          <li>POST /todos {'{'} title {'}'} -> 201, Location</li>
          <li>GET /todos -> 200 JSON配列</li>
          <li>GET /todos/{'{'}id{'}'} -> 200 or 404</li>
          <li>title: 1〜100文字</li>
        </ul>
        <p className="text-xs text-slate-500">rubrics/todo_api.yaml を利用して採点します（MVP）。</p>
      </section>

      <header className="space-y-2">
        <p className="text-sm font-semibold text-brand-600">{role === 'INSTRUCTOR' ? '講師アカウントで学生ビューを表示中' : '学生ビュー'}</p>
        <h1 className="text-2xl font-bold text-slate-900">課題一覧と提出</h1>
        <p className="text-sm text-slate-600">
          提出済みの課題を確認し、GitHubなどのリポジトリURLを送信してください。
        </p>
      </header>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">課題一覧</h2>
            <p className="text-sm text-slate-600">提出対象の課題を選択してください。</p>
          </div>
          <p className="text-sm text-slate-500">
            {assignmentsQuery.isLoading
              ? '読込中...'
              : `${assignmentsQuery.data?.length ?? 0} 件`}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {assignmentsQuery.isLoading ? (
            <p className="text-sm text-slate-600">課題情報を読み込み中です...</p>
          ) : null}
          {assignmentsQuery.isError ? (
            <p className="text-sm text-rose-600" role="alert">
              {(assignmentsQuery.error as Error).message}
            </p>
          ) : null}
          {assignmentsQuery.data?.map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              onClick={() => setSelectedAssignmentId(assignment.id)}
              className={
                'rounded-lg border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
                (assignment.id === selectedAssignmentId
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-slate-200 hover:bg-slate-50')
              }
            >
              <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
              <p className="mt-1 text-xs text-slate-600">提出期限: {new Date(assignment.dueAt).toLocaleString('ja-JP')}</p>
              <p className="mt-2 line-clamp-3 text-xs text-slate-500">{assignment.description}</p>
            </button>
          ))}
          {!assignmentsQuery.isLoading && (assignmentsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600">現在表示できる課題がありません。</p>
          ) : null}
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">課題を提出</h2>
          <p className="text-sm text-slate-600">
            選択中の課題にリポジトリURLを提出します。URLは https:// で始まる必要があります。
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            提出する課題
            <select
              value={selectedAssignmentId}
              onChange={(event) => setSelectedAssignmentId(event.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
              required
            >
              <option value="" disabled>
                課題を選択してください
              </option>
              {assignmentsQuery.data?.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            リポジトリURL
            <input
              type="url"
              required
              value={repoUrl}
              placeholder="https://github.com/username/repository"
              onChange={(event) => setRepoUrl(event.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className="button-primary" disabled={createSubmission.isPending}>
              {createSubmission.isPending ? '送信中...' : '提出する'}
            </button>
            {errorMessage ? (
              <p className="text-sm text-rose-600" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {createSubmission.isSuccess ? (
              <p className="text-sm text-brand-700">提出を受け付けました。</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">提出履歴</h2>
            <p className="text-sm text-slate-600">最近提出した課題の状況を確認できます。</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['student', 'submissions'] });
            }}
          >
            更新する
          </button>
        </div>
        {submissionsQuery.isLoading ? (
          <p className="text-sm text-slate-600">提出履歴を読み込み中です...</p>
        ) : null}
        {submissionsQuery.isError ? (
          <p className="text-sm text-rose-600" role="alert">
            {(submissionsQuery.error as Error).message}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="hidden grid-cols-12 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 md:grid">
            <div className="col-span-4">課題</div>
            <div className="col-span-3">リポジトリ</div>
            <div className="col-span-2">提出日時</div>
            <div className="col-span-2">ステータス</div>
            <div className="col-span-1">詳細</div>
          </div>
          <ul className="divide-y divide-slate-200">
            {filteredSubmissions.map((submission) => (
              <li key={submission.id} className="grid gap-2 px-4 py-3 md:grid-cols-12 md:items-center">
                <p className="text-sm font-medium text-slate-900 md:col-span-4">
                  {assignmentsQuery.data?.find((a) => a.id === submission.assignmentId)?.title ?? '不明な課題'}
                </p>
                <div className="md:col-span-3">
                  <a href={submission.repoUrl} target="_blank" rel="noreferrer" className="break-all text-sm">
                    {submission.repoUrl}
                  </a>
                </div>
                <p className="md:col-span-2 text-sm text-slate-600">
                  {new Date(submission.createdAt).toLocaleString('ja-JP')}
                </p>
                <p className="md:col-span-2 text-sm font-medium text-slate-700">
                  {submissionStatusLabel[submission.status]}
                </p>
                <div className="md:col-span-1">
                  <Link
                    to={`/student/submissions/${submission.id}`}
                    className="button-secondary w-full text-center text-sm"
                  >
                    詳細
                  </Link>
                </div>
              </li>
            ))}
            {!submissionsQuery.isLoading && filteredSubmissions.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-600">
                提出履歴がまだありません。
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
};

