import {
  assignmentSchema,
  createAssignmentInputSchema,
  createSubmissionInputSchema,
  gradeSchema,
  submissionSchema
} from '@launchpad/shared';
import type {
  Assignment,
  CreateAssignmentInput,
  CreateSubmissionInput,
  Grade,
  Submission
} from '@launchpad/shared';
import { z } from 'zod';

const assignmentsSchema = assignmentSchema.array();
const submissionsSchema = submissionSchema.array();

const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8787';

const parseError = async (response: Response) => {
  try {
    const data = await response.clone().json();
    if (typeof data === 'string') return data;
    return data.error ?? data.message ?? response.statusText;
  } catch (_) {
    return response.statusText;
  }
};

type RawFetchOptions = {
  allowedStatus?: number[];
};

const ensureToken = (token: string) => {
  if (!token) {
    throw new Error('Authentication token is required.');
  }
};

export const createApiClient = (token: string, baseUrl: string = DEFAULT_API_BASE) => {
  const rawFetch = async (
    path: string,
    init?: RequestInit,
    options: RawFetchOptions = {}
  ) => {
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

  const requestJson = async <Schema extends z.ZodTypeAny>(
    path: string,
    init: RequestInit | undefined,
    schema: Schema,
    options?: RawFetchOptions
  ): Promise<z.infer<Schema>> => {
    const response = await rawFetch(path, init, options);
    if (response.status === 204) {
      return undefined as z.infer<Schema>;
    }
    const payload = await response.json();
    return schema.parse(payload);
  };

  return {
    async listAssignments(): Promise<Assignment[]> {
      return await requestJson('/assignments', { method: 'GET' }, assignmentsSchema);
    },

    async createAssignment(payload: CreateAssignmentInput): Promise<Assignment> {
      const body = createAssignmentInputSchema.parse(payload);
      return await requestJson(
        '/assignments',
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        assignmentSchema
      );
    },

    async listSubmissions({ assignmentId }: { assignmentId: string }): Promise<Submission[]> {
      return await requestJson(
        `/submissions?assignmentId=${encodeURIComponent(assignmentId)}`,
        { method: 'GET' },
        submissionsSchema
      );
    },

    async createSubmission(payload: CreateSubmissionInput): Promise<Submission> {
      const body = createSubmissionInputSchema.parse(payload);
      return await requestJson(
        '/submissions',
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        submissionSchema
      );
    },

    async getGrade(submissionId: string): Promise<Grade | null> {
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

export type { CreateAssignmentInput, CreateSubmissionInput } from '@launchpad/shared';
