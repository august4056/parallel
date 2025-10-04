import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './components/AppLayout';
import { Landing } from './pages/Landing';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentSubmissionDetail } from './pages/StudentSubmissionDetail';
import { InstructorDashboard } from './pages/InstructorDashboard';

export const App = () => {
  const { isInitialized, isAuthenticated, role } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">読み込み中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={<Navigate to={role === 'INSTRUCTOR' ? '/instructor' : '/student'} replace />}
        />
        <Route path="student" element={<StudentDashboard />} />
        <Route path="student/submissions/:submissionId" element={<StudentSubmissionDetail />} />
        {role === 'INSTRUCTOR' ? (
          <Route path="instructor" element={<InstructorDashboard />} />
        ) : null}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
