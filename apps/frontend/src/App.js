import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createApiClient } from './lib/apiClient';
const queryClient = new QueryClient();
const statusLabels = {
    QUEUED: 'Queued',
    RUNNING: 'Running',
    PASSED: 'Passed',
    FAILED: 'Failed'
};
const Dashboard = () => {
    const [token, setToken] = useState('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const [focusedSubmissionId, setFocusedSubmissionId] = useState(null);
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
    const assignmentsQuery = useQuery({
        queryKey: ['assignments', token],
        queryFn: () => api.listAssignments(),
        enabled: token.length > 0
    });
    useEffect(() => {
        if (assignmentsQuery.data?.length && !selectedAssignmentId) {
            setSelectedAssignmentId(assignmentsQuery.data[0].id);
        }
    }, [assignmentsQuery.data, selectedAssignmentId]);
    const submissionsQuery = useQuery({
        queryKey: ['submissions', selectedAssignmentId, token],
        queryFn: () => api.listSubmissions({
            assignmentId: selectedAssignmentId
        }),
        enabled: token.length > 0 && Boolean(selectedAssignmentId)
    });
    const gradeQuery = useQuery({
        queryKey: ['grades', focusedSubmissionId, token],
        queryFn: () => api.getGrade(focusedSubmissionId),
        enabled: token.length > 0 && Boolean(focusedSubmissionId),
        staleTime: 0
    });
    const createAssignment = useMutation({
        mutationFn: (payload) => api.createAssignment(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['assignments'] });
            setAssignmentForm({ title: '', description: '', dueAt: '' });
        }
    });
    const createSubmission = useMutation({
        mutationFn: (payload) => api.createSubmission(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['submissions'] });
            setSubmissionForm({ repoUrl: '' });
        }
    });
    return (_jsxs("div", { className: "app", children: [_jsx("header", { className: "app__header", children: _jsxs("div", { className: "app__header-inner", children: [_jsx("h1", { children: "LaunchPad Lab" }), _jsx("p", { className: "muted", children: "MVP console for assignments and submissions orchestrating Supabase, Cloudflare Workers, and Cloud Run Jobs." })] }) }), _jsxs("main", { className: "app__main", children: [_jsxs("section", { className: "panel", children: [_jsx("h2", { children: "Session" }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Supabase access token" }), _jsx("input", { placeholder: "Paste a Supabase JWT", value: token, onChange: (event) => setToken(event.target.value) })] }), _jsx("p", { className: "muted small", children: "Tokens issued by Supabase Auth are required to talk with the Cloudflare Worker." })] }), token.length === 0 ? (_jsx("section", { className: "panel panel--placeholder", children: "Provide an access token to load assignments and submissions." })) : (_jsxs("div", { className: "layout", children: [_jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panel__header", children: [_jsx("h2", { children: "Assignments" }), _jsx("span", { className: "badge", children: assignmentsQuery.isLoading
                                                    ? 'Loading...'
                                                    : `${assignmentsQuery.data?.length ?? 0} items` })] }), assignmentsQuery.isError ? (_jsxs("p", { className: "error", children: ["Failed to load assignments. ", assignmentsQuery.error.message] })) : null, _jsxs("ul", { className: "item-list", children: [assignmentsQuery.data?.map((assignment) => (_jsx("li", { children: _jsxs("button", { type: "button", className: selectedAssignmentId === assignment.id
                                                        ? 'item item--active'
                                                        : 'item', onClick: () => {
                                                        setSelectedAssignmentId(assignment.id);
                                                        setFocusedSubmissionId(null);
                                                    }, children: [_jsx("strong", { children: assignment.title }), _jsxs("span", { className: "muted small", children: ["Due ", new Date(assignment.dueAt).toLocaleString()] })] }) }, assignment.id))), assignmentsQuery.data?.length === 0 ? (_jsx("li", { className: "placeholder", children: "No assignments yet." })) : null] }), _jsxs("form", { className: "form", onSubmit: (event) => {
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
                                        }, children: [_jsx("h3", { children: "Create assignment" }), _jsx("input", { placeholder: "Title", value: assignmentForm.title, onChange: (event) => setAssignmentForm((prev) => ({ ...prev, title: event.target.value })) }), _jsx("textarea", { placeholder: "Description", rows: 3, value: assignmentForm.description, onChange: (event) => setAssignmentForm((prev) => ({
                                                    ...prev,
                                                    description: event.target.value
                                                })) }), _jsxs("label", { className: "field small", children: [_jsx("span", { children: "Due date" }), _jsx("input", { type: "datetime-local", value: assignmentForm.dueAt, onChange: (event) => setAssignmentForm((prev) => ({ ...prev, dueAt: event.target.value })) })] }), _jsx("button", { type: "submit", disabled: createAssignment.isPending, children: createAssignment.isPending ? 'Creating...' : 'Create assignment' }), createAssignment.isError ? (_jsx("p", { className: "error", children: createAssignment.error.message })) : null] })] }), _jsxs("section", { className: "panel", children: [_jsxs("div", { className: "panel__header", children: [_jsx("h2", { children: "Submissions" }), _jsx("span", { className: "badge", children: submissionsQuery.isLoading
                                                    ? 'Loading...'
                                                    : `${submissionsQuery.data?.length ?? 0} items` })] }), submissionsQuery.isError ? (_jsxs("p", { className: "error", children: ["Failed to load submissions. ", submissionsQuery.error.message] })) : null, _jsxs("ul", { className: "item-list", children: [submissionsQuery.data?.map((submission) => (_jsxs("li", { className: "card", children: [_jsxs("div", { className: "card__row", children: [_jsxs("div", { children: [_jsx("p", { className: "mono", children: submission.repoUrl }), _jsxs("p", { className: "muted small", children: ["Updated ", new Date(submission.updatedAt).toLocaleString()] })] }), _jsx("span", { className: `status status--${submission.status.toLowerCase()}`, children: statusLabels[submission.status] })] }), _jsxs("div", { className: "card__actions", children: [_jsx("a", { href: submission.repoUrl, target: "_blank", rel: "noreferrer", children: "Open repository" }), _jsx("button", { type: "button", onClick: () => setFocusedSubmissionId(submission.id), children: "View grade" })] })] }, submission.id))), submissionsQuery.data?.length === 0 ? (_jsx("li", { className: "placeholder", children: "No submissions yet." })) : null] }), _jsxs("form", { className: "form", onSubmit: (event) => {
                                            event.preventDefault();
                                            const cleanedUrl = submissionForm.repoUrl.trim();
                                            if (!selectedAssignmentId || !cleanedUrl) {
                                                return;
                                            }
                                            createSubmission.mutate({
                                                assignmentId: selectedAssignmentId,
                                                repoUrl: cleanedUrl
                                            });
                                        }, children: [_jsx("h3", { children: "Submit repository" }), _jsx("input", { placeholder: "Repository URL", value: submissionForm.repoUrl, onChange: (event) => setSubmissionForm({ repoUrl: event.target.value }) }), _jsx("button", { type: "submit", disabled: createSubmission.isPending, children: createSubmission.isPending ? 'Submitting...' : 'Queue submission' }), createSubmission.isError ? (_jsx("p", { className: "error", children: createSubmission.error.message })) : null] }), focusedSubmissionId ? (_jsxs("div", { className: "drawer", children: [_jsxs("div", { className: "drawer__header", children: [_jsx("h3", { children: "Grade detail" }), _jsx("button", { type: "button", onClick: () => setFocusedSubmissionId(null), children: "Close" })] }), gradeQuery.isLoading ? (_jsx("p", { className: "muted", children: "Loading grade..." })) : gradeQuery.isError ? (_jsx("p", { className: "error", children: gradeQuery.error.message })) : gradeQuery.data ? (_jsxs("div", { className: "drawer__content", children: [_jsxs("p", { children: [_jsx("strong", { children: "Total score:" }), " ", gradeQuery.data.totalScore] }), _jsxs("p", { className: "muted small", children: ["Graded at ", new Date(gradeQuery.data.gradedAt).toLocaleString()] }), _jsx("pre", { children: JSON.stringify(gradeQuery.data.rubric, null, 2) })] })) : (_jsx("p", { className: "muted", children: "No grade available yet." }))] })) : null] })] }))] })] }));
};
export const App = () => {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(Dashboard, {}) }));
};
