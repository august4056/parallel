import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../hooks/useAuth';

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    isActive ? 'bg-brand-100 text-brand-800' : 'text-slate-700 hover:bg-slate-100'
  );

export const AppLayout = () => {
  const { userEmail, role, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="absolute left-2 top-2 z-50 -translate-y-full rounded bg-white px-3 py-2 text-sm font-semibold text-brand-700 focus:translate-y-0">
        メインコンテンツへスキップ
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xl font-semibold text-brand-700">Parallel Classroom</p>
            <p className="text-sm text-slate-500">学習者と講師のための提出管理ポータル</p>
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="メインナビゲーション" className="hidden gap-2 md:flex">
              <NavLink to="/student" className={navLinkClasses}>
                学生ダッシュボード
              </NavLink>
              {role === 'INSTRUCTOR' ? (
                <NavLink to="/instructor" className={navLinkClasses}>
                  講師ダッシュボード
                </NavLink>
              ) : null}
            </nav>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{userEmail ?? 'ゲスト'}</p>
              <p className="text-xs text-slate-500">{role === 'INSTRUCTOR' ? '講師' : '学生'}</p>
            </div>
            <button type="button" className="button-secondary" onClick={() => signOut().catch(console.error)}>
              ログアウト
            </button>
          </div>
        </div>
        <nav aria-label="メインナビゲーション (モバイル)" className="border-t border-slate-200 bg-slate-50 md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
            <NavLink to="/student" className={navLinkClasses}>
              学生
            </NavLink>
            {role === 'INSTRUCTOR' ? (
              <NavLink to="/instructor" className={navLinkClasses}>
                講師
              </NavLink>
            ) : null}
          </div>
        </nav>
      </header>
      <main id="main" className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500">
          APIは `apps/worker` のエンドポイントを利用しています。
        </div>
      </footer>
    </div>
  );
};
