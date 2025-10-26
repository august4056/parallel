import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import type { SubmissionDetail } from '../lib/api';

export const StudentSubmissionDetail = () => {
  const { submissionId } = useParams();
  const api = useApi();

  const detailQuery = useQuery<SubmissionDetail>({
    queryKey: ['submission-detail', submissionId],
    queryFn: () => api!.getSubmissionDetail(submissionId as string),
    enabled: Boolean(api && submissionId)
  });

  const gradeContent = useMemo(() => {
    if (detailQuery.isLoading) {
      return <p className="text-sm text-slate-600">読み込み中...</p>;
    }
    if (detailQuery.isError) {
      return (
        <p className="text-sm text-rose-600" role="alert">
          {(detailQuery.error as Error).message}
        </p>
      );
    }
    if (!detailQuery.data) {
      return <p className="text-sm text-slate-600">データが見つかりませんでした。</p>;
    }

    if (!detailQuery.data.grade) {
      return <p className="text-sm text-slate-600">採点はまだ完了していません。後ほど再度ご確認ください。</p>;
    }

    const { grade } = detailQuery.data as SubmissionDetail;

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">総合スコア</p>
          <p className="mt-1 text-2xl font-bold text-brand-700">{grade.totalScore}</p>
          <p className="text-xs text-slate-500">
            採点日時: {new Date(grade.gradedAt).toLocaleString('ja-JP')}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">評価詳細 (JSON)</h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900/90 p-4 text-xs text-slate-100">
            {JSON.stringify(grade.rubric, null, 2)}
          </pre>
        </div>
      </div>
    );
  }, [detailQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">提出詳細</h1>
          <p className="text-sm text-slate-600">提出ID: {submissionId}</p>
        </div>
        <Link to="/student" className="button-secondary">
          提出一覧に戻る
        </Link>
      </div>

      {detailQuery.data ? (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">提出情報</h2>
            <dl className="space-y-2 text-sm text-slate-700">
              <div>
                <dt className="font-medium text-slate-500">リポジトリ</dt>
                <dd>
                  <a
                    href={detailQuery.data.submission.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all"
                  >
                    {detailQuery.data.submission.repoUrl}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">提出日時</dt>
                <dd>{new Date(detailQuery.data.submission.createdAt).toLocaleString('ja-JP')}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">ステータス</dt>
                <dd className="font-semibold text-slate-900">{detailQuery.data.submission.status}</dd>
              </div>
            </dl>
          </section>
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">採点結果</h2>
            {gradeContent}
          </section>
        </div>
      ) : (
        gradeContent
      )}
    </div>
  );
};
