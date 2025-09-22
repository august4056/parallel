import { useEffect, useMemo, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import type {
  Assignment,
  Grade,
  Submission,
  SubmissionStatus
} from '@launchpad/shared';
import {
  type CreateAssignmentInput,
  type CreateSubmissionInput,
  createApiClient
} from './lib/apiClient';

const queryClient = new QueryClient();

const statusLabels: Record<SubmissionStatus, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  PASSED: 'Passed',
  FAILED: 'Failed'
};

const Dashboard = () => {
  const [token, setToken] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [focusedSubmissionId, setFocusedSubmissionId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueAt: ''
  });
  const [submissionForm, setSubmissionForm] = useState({
    repoUrl: ''
  });

  const api = useMemo(() => createApiClient(token), [token]);
  const queryClient = useQueryClient();

  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: ['assignments', token],
    queryFn: () => api.listAssignments(),
    enabled: token.length > 0
  });

  useEffect(() => {
    if (assignmentsQuery.data?.length && !selectedAssignmentId) {
      setSelectedAssignmentId(assignmentsQuery.data[0].id);
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const submissionsQuery = useQuery<Submission[]>({
    queryKey: ['submissions', selectedAssignmentId, token],
    queryFn: () =>
      api.listSubmissions({
        assignmentId: selectedAssignmentId as string
      }),
    enabled: token.length > 0 && Boolean(selectedAssignmentId)
  });

  const gradeQuery = useQuery<Grade | null>({
    queryKey: ['grades', focusedSubmissionId, token],
    queryFn: () => api.getGrade(focusedSubmissionId as string),
    enabled: token.length > 0 && Boolean(focusedSubmissionId),
    staleTime: 0
  });

  const createAssignment = useMutation({
    mutationFn: (payload: CreateAssignmentInput) => api.createAssignment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setAssignmentForm({ title: '', description: '', dueAt: '' });
    }
  });

  const createSubmission = useMutation({
    mutationFn: (payload: CreateSubmissionInput) => api.createSubmission(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSubmissionForm({ repoUrl: '' });
    }
  });

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-inner">
          <h1>LaunchPad Lab</h1>
          <p className="muted">
            MVP console for assignments and submissions orchestrating Supabase,
            Cloudflare Workers, and Cloud Run Jobs.
          </p>
        </div>
      </header>

      <main className="app__main">
        <section className="panel">
          <h2>Session</h2>
          <label className="field">
            <span>Supabase access token</span>
            <input
              placeholder="Paste a Supabase JWT"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <p className="muted small">
            Tokens issued by Supabase Auth are required to talk with the
            Cloudflare Worker.
          </p>
        </section>

        {token.length === 0 ? (
          <section className="panel panel--placeholder">
            Provide an access token to load assignments and submissions.
          </section>
        ) : (
          <div className="layout">
            <section className="panel">
              <div className="panel__header">
                <h2>Assignments</h2>
                <span className="badge">
                  {assignmentsQuery.isLoading
                    ? 'Loading...'
                    : `${assignmentsQuery.data?.length ?? 0} items`}
                </span>
              </div>
              {assignmentsQuery.isError ? (
                <p className="error">
                  Failed to load assignments. {(assignmentsQuery.error as Error).message}
                </p>
              ) : null}
              <ul className="item-list">
                {assignmentsQuery.data?.map((assignment) => (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      className={
                        selectedAssignmentId === assignment.id
                          ? 'item item--active'
                          : 'item'
                      }
                      onClick={() => {
                        setSelectedAssignmentId(assignment.id);
                        setFocusedSubmissionId(null);
                      }}
                    >
                      <strong>{assignment.title}</strong>
                      <span className="muted small">
                        Due {new Date(assignment.dueAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
                {assignmentsQuery.data?.length === 0 ? (
                  <li className="placeholder">No assignments yet.</li>
                ) : null}
              </ul>

              <form
                className="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = assignmentForm.title.trim();
                  const description = assignmentForm.description.trim();
                  if (!title || !assignmentForm.dueAt) {
                    return;
                  }
                  createAssignment.mutate({
                    title,
                    description: description.length > 0 ? description : undefined,
                    dueAt: new Date(assignmentForm.dueAt).toISOString()
                  });
                }}
              >
                <h3>Create assignment</h3>
                <input
                  placeholder="Title"
                  value={assignmentForm.title}
                  onChange={(event) =>
                    setAssignmentForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  value={assignmentForm.description}
                  onChange={(event) =>
                    setAssignmentForm((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                />
                <label className="field small">
                  <span>Due date</span>
                  <input
                    type="datetime-local"
                    value={assignmentForm.dueAt}
                    onChange={(event) =>
                      setAssignmentForm((prev) => ({ ...prev, dueAt: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? 'Creating...' : 'Create assignment'}
                </button>
                {createAssignment.isError ? (
                  <p className="error">
                    {(createAssignment.error as Error).message}
                  </p>
                ) : null}
              </form>
            </section>

            <section className="panel">
              <div className="panel__header">
                <h2>Submissions</h2>
                <span className="badge">
                  {submissionsQuery.isLoading
                    ? 'Loading...'
                    : `${submissionsQuery.data?.length ?? 0} items`}
                </span>
              </div>
              {submissionsQuery.isError ? (
                <p className="error">
                  Failed to load submissions. {(submissionsQuery.error as Error).message}
                </p>
              ) : null}
              <ul className="item-list">
                {submissionsQuery.data?.map((submission) => (
                  <li key={submission.id} className="card">
                    <div className="card__row">
                      <div>
                        <p className="mono">{submission.repoUrl}</p>
                        <p className="muted small">
                          Updated {new Date(submission.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status status--${submission.status.toLowerCase()}`}>
                        {statusLabels[submission.status]}
                      </span>
                    </div>
                    <div className="card__actions">
                      <a href={submission.repoUrl} target="_blank" rel="noreferrer">
                        Open repository
                      </a>
                      <button type="button" onClick={() => setFocusedSubmissionId(submission.id)}>
                        View grade
                      </button>
                    </div>
                  </li>
                ))}
                {submissionsQuery.data?.length === 0 ? (
                  <li className="placeholder">No submissions yet.</li>
                ) : null}
              </ul>

              <form
                className="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const cleanedUrl = submissionForm.repoUrl.trim();
                  if (!selectedAssignmentId || !cleanedUrl) {
                    return;
                  }
                  createSubmission.mutate({
                    assignmentId: selectedAssignmentId,
                    repoUrl: cleanedUrl
                  });
                }}
              >
                <h3>Submit repository</h3>
                <input
                  placeholder="Repository URL"
                  value={submissionForm.repoUrl}
                  onChange={(event) =>
                    setSubmissionForm({ repoUrl: event.target.value })
                  }
                />
                <button type="submit" disabled={createSubmission.isPending}>
                  {createSubmission.isPending ? 'Submitting...' : 'Queue submission'}
                </button>
                {createSubmission.isError ? (
                  <p className="error">
                    {(createSubmission.error as Error).message}
                  </p>
                ) : null}
              </form>

              {focusedSubmissionId ? (
                <div className="drawer">
                  <div className="drawer__header">
                    <h3>Grade detail</h3>
                    <button type="button" onClick={() => setFocusedSubmissionId(null)}>
                      Close
                    </button>
                  </div>
                  {gradeQuery.isLoading ? (
                    <p className="muted">Loading grade...</p>
                  ) : gradeQuery.isError ? (
                    <p className="error">{(gradeQuery.error as Error).message}</p>
                  ) : gradeQuery.data ? (
                    <div className="drawer__content">
                      <p>
                        <strong>Total score:</strong> {gradeQuery.data.totalScore}
                      </p>
                      <p className="muted small">
                        Graded at {new Date(gradeQuery.data.gradedAt).toLocaleString()}
                      </p>
                      <pre>{JSON.stringify(gradeQuery.data.rubric, null, 2)}</pre>
                    </div>
                  ) : (
                    <p className="muted">No grade available yet.</p>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
};
