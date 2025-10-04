import { FormEvent, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Landing = () => {
  const { signInWithGitHub, signInWithEmailLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('メールアドレスを入力してください');
      setStatus('error');
      return;
    }
    setStatus('pending');
    setErrorMessage(null);
    try {
      await signInWithEmailLink(trimmedEmail);
      setStatus('sent');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '送信に失敗しました');
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-12 px-4 py-16">
      <section className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Parallel Project
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          課題管理と採点状況をひとつのポータルで
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Supabase認証でサインインして、学生は課題を提出し、講師は採点状況を確認できます。
        </p>
      </section>

      <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">メールリンクでログイン</h2>
          <p className="mt-2 text-sm text-slate-600">
            入力したメールアドレスにログイン用のリンクを送信します。
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleEmailSubmit}>
            <label className="block text-left text-sm font-medium text-slate-700">
              メールアドレス
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </label>
            <button
              type="submit"
              className="button-primary w-full"
              disabled={status === 'pending'}
            >
              {status === 'pending' ? '送信中...' : 'ログインリンクを送信'}
            </button>
            {status === 'sent' ? (
              <p className="text-sm text-brand-700">
                送信しました。メールボックスを確認してください。
              </p>
            ) : null}
            {status === 'error' && errorMessage ? (
              <p className="text-sm text-rose-600" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">GitHubでログイン</h2>
          <p className="text-sm text-slate-600">
            GitHub OAuthを利用して素早くサインインできます。
          </p>
          <button
            type="button"
            className="button-secondary w-full"
            onClick={() => {
              void signInWithGitHub();
            }}
          >
            GitHubでサインイン
          </button>
          <p className="text-xs text-slate-500">
            サインイン後、自動的にこのブラウザへリダイレクトされます。
          </p>
        </div>
      </section>
    </div>
  );
};
