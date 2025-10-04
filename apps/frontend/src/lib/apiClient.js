import { assignmentSchema, createAssignmentInputSchema, createSubmissionInputSchema, gradeSchema, submissionSchema } from '@launchpad/shared';
const assignmentsSchema = assignmentSchema.array();
const submissionsSchema = submissionSchema.array();
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL ??
    'http://localhost:8787';
const parseError = async (response) => {
    try {
        const data = await response.clone().json();
        if (typeof data === 'string')
            return data;
        return data.error ?? data.message ?? response.statusText;
    }
    catch (_) {
        return response.statusText;
    }
};
const ensureToken = (token) => {
    if (!token) {
        throw new Error('Authentication token is required.');
    }
};
export const createApiClient = (token, baseUrl = DEFAULT_API_BASE) => {
    const rawFetch = async (path, init, options = {}) => {
        ensureToken(token);
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        if (init?.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers
        });
        const isAllowed = options.allowedStatus?.includes(response.status) ?? false;
        if (!response.ok && !isAllowed) {
            throw new Error(await parseError(response));
        }
        return response;
    };
    const requestJson = async (path, init, schema, options) => {
        const response = await rawFetch(path, init, options);
        if (response.status === 204) {
            return undefined;
        }
        const payload = await response.json();
        return schema.parse(payload);
    };
    return {
        async listAssignments() {
            return await requestJson('/assignments', { method: 'GET' }, assignmentsSchema);
        },
        async createAssignment(payload) {
            const body = createAssignmentInputSchema.parse(payload);
            return await requestJson('/assignments', {
                method: 'POST',
                body: JSON.stringify(body)
            }, assignmentSchema);
        },
        async listSubmissions({ assignmentId }) {
            return await requestJson(`/submissions?assignmentId=${encodeURIComponent(assignmentId)}`, { method: 'GET' }, submissionsSchema);
        },
        async createSubmission(payload) {
            const body = createSubmissionInputSchema.parse(payload);
            return await requestJson('/submissions', {
                method: 'POST',
                body: JSON.stringify(body)
            }, submissionSchema);
        },
        async getGrade(submissionId) {
            const response = await rawFetch(`/grades/${submissionId}`, { method: 'GET' }, {
                allowedStatus: [404]
            });
            if (response.status === 404) {
                return null;
            }
            const payload = await response.json();
            return gradeSchema.parse(payload);
        }
    };
};
