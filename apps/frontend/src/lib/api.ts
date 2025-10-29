import { z } from 'zod';

// Local Zod schemas and types to avoid cross-package coupling during Vercel build
const userSchema = z
  .object({ id: z.string(), email: z.string().email() })
  .strict();
export type User = z.infer<typeof userSchema>;

const assignmentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().default(''),
    dueAt: z.string(),
    createdBy: z.string().optional(),
    createdAt: z.string().optional()
  })
  .strict();
export type Assignment = z.infer<typeof assignmentSchema>;

const submissionSchema = z
  .object({
    id: z.string(),
    userId: z.string().optional(),
    assignmentId: z.string(),
    repoUrl: z.string().url(),
    status: z.enum(['QUEUED', 'RUNNING', 'PASSED', 'FAILED']),
    score: z.number().nullable().optional(),
    feedback: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    student: userSchema.optional()
  })
  .strict();
export type Submission = z.infer<typeof submissionSchema>;

const gradeSchema = z
  .object({
    id: z.string(),
    submissionId: z.string(),
    rubric: z.unknown(),
    totalScore: z.number(),
    gradedAt: z.string()
  })
  .strict();
export type Grade = z.infer<typeof gradeSchema>;

export const createSubmissionInputSchema = z
  .object({ assignmentId: z.string(), repoUrl: z.string().url() })
  .strict();
export type CreateSubmissionInput = z.infer<typeof createSubmissionInputSchema>;

export const createAssignmentInputSchema = z
  .object({ title: z.string().min(1), description: z.string().optional(), dueAt: z.string() })
  .strict();
export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

const baseUrl = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';

const submissionArraySchema = submissionSchema.array();
const assignmentArraySchema = assignmentSchema.array();

const studentSubmissionDetailSchema = z
  .object({
    submission: submissionSchema,
    grade: gradeSchema.nullable().optional()
  })
  .strict();

const instructorSubmissionSchema = submissionSchema
  .extend({
    student: userSchema.pick({ id: true, email: true })
  })
  .strict();

const instructorSubmissionArraySchema = instructorSubmissionSchema.array();

const regradeResponseSchema = z
  .object({
    status: z.literal('accepted'),
    requestedAt: z.string().datetime()
  })
  .strict();

type RawFetchOptions = {
  allowedStatus?: number[];
};

const parseError = async (response: Response) => {
  try {
    const payload = await response.clone().json();
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload?.error) {
      return payload.error;
    }
    if (payload?.message) {
      return payload.message;
    }
  } catch (error) {
    console.error('Failed to parse error payload', error);
  }
  return response.statusText;
};

const ensureToken = (token: string) => {
  if (!token) {
    throw new Error('Authentication is required to call the API.');
  }
};

export type ApiClient = ReturnType<typeof createApiClient>;

export const createApiClient = (token: string, apiBase: string = baseUrl) => {
  const rawFetch = async (
    path: string,
    init?: RequestInit,
    options: RawFetchOptions = {}
  ): Promise<Response> => {
    ensureToken(token);
    const headers = new Headers(init?.headers);
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${apiBase}${path}`, {
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
    const result = await response.json();
    return schema.parse(result);
  };

  return {
    async listAssignments(): Promise<Assignment[]> {
      return await requestJson('/assignments', { method: 'GET' }, assignmentArraySchema);
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

    async listStudentSubmissions(): Promise<Submission[]> {
      return await requestJson('/submissions/me', { method: 'GET' }, submissionArraySchema);
    },

    async listAssignmentSubmissions(assignmentId: string) {
      return await requestJson(
        `/assignments/${encodeURIComponent(assignmentId)}/submissions`,
        { method: 'GET' },
        instructorSubmissionArraySchema
      );
    },

    async createSubmission(payload: CreateSubmissionInput): Promise<Submission> {
      const body = createSubmissionInputSchema.parse(payload);
      return await requestJson(
        `/assignments/${encodeURIComponent(body.assignmentId)}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify({ repoUrl: body.repoUrl })
        },
        submissionSchema
      );
    },

    async getSubmissionDetail(submissionId: string) {
      return await requestJson(
        `/submissions/${encodeURIComponent(submissionId)}`,
        { method: 'GET' },
        studentSubmissionDetailSchema
      );
    },

    async requestRegrade(submissionId: string) {
      return await requestJson(
        `/submissions/${encodeURIComponent(submissionId)}/regrade`,
        {
          method: 'POST'
        },
        regradeResponseSchema
      );
    }
  };
};

export type InstructorSubmission = z.infer<typeof instructorSubmissionSchema>;
export type SubmissionDetail = z.infer<typeof studentSubmissionDetailSchema>;
export type RegradeResponse = z.infer<typeof regradeResponseSchema>;
