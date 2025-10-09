import { z } from 'zod';
import type {
  Assignment,
  AuthenticatedUser,
  Grade,
  Submission,
  SubmissionStatus,
  WorkerBindings
} from './types';
import { logError } from './logger';

const assignmentRecord = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().default(''),
  due_at: z.string(),
  created_by: z.string(),
  created_at: z.string()
});

const submissionRecord = z.object({
  id: z.string(),
  user_id: z.string(),
  assignment_id: z.string(),
  repo_url: z.string(),
  status: z.string(),
  score: z.union([z.number(), z.string()]).nullable(),
  feedback: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

const gradeRecord = z.object({
  id: z.string(),
  submission_id: z.string(),
  rubric_json: z.unknown().nullable(),
  total_score: z.union([z.number(), z.string()]),
  graded_at: z.string(),
  submission: z
    .object({
      user_id: z.string().optional()
    })
    .optional()
});

const SUPABASE_STATUS: SubmissionStatus[] = ['QUEUED', 'PROCESSING', 'COMPLETE', 'FAILED'];

const parseStatus = (candidate: string): SubmissionStatus => {
  if ((SUPABASE_STATUS as string[]).includes(candidate)) {
    return candidate as SubmissionStatus;
  }
  return 'QUEUED';
};

type RequestOptions = RequestInit & { search?: string };

const parseError = async (response: Response) => {
  try {
    const data = await response.clone().json();
    if (typeof data === 'string') return data;
    return data?.message ?? data?.error ?? response.statusText;
  } catch (error) {
    logError('supabase.parse_error', { error: error instanceof Error ? error.message : String(error) });
    return response.statusText;
  }
};

const supabaseFetch = async (
  env: WorkerBindings,
  path: string,
  options: RequestOptions
): Promise<Response> => {
  const baseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('SUPABASE_URL is not configured');
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set('apikey', env.SUPABASE_SERVICE_ROLE_KEY);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${baseUrl}/rest/v1${path}${options.search ?? ''}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response;
};

const toAssignment = (record: z.infer<typeof assignmentRecord>): Assignment => ({
  id: record.id,
  title: record.title,
  description: record.description ?? '',
  dueAt: record.due_at,
  createdBy: record.created_by,
  createdAt: record.created_at
});

const toSubmission = (record: z.infer<typeof submissionRecord>): Submission => ({
  id: record.id,
  userId: record.user_id,
  assignmentId: record.assignment_id,
  repoUrl: record.repo_url,
  status: parseStatus(record.status),
  score: record.score === null ? null : Number(record.score),
  feedback: record.feedback,
  createdAt: record.created_at,
  updatedAt: record.updated_at
});

const toGrade = (record: z.infer<typeof gradeRecord>): Grade => ({
  id: record.id,
  submissionId: record.submission_id,
  rubric: record.rubric_json ?? {},
  totalScore: Number(record.total_score),
  gradedAt: record.graded_at
});

export interface SubmissionPayload {
  assignmentId: string;
  repoUrl: string;
}

export interface AssignmentPayload {
  title: string;
  description?: string | null;
  dueAt: string;
}

export const createSubmission = async (
  env: WorkerBindings,
  user: AuthenticatedUser,
  payload: SubmissionPayload
): Promise<Submission> => {
  const response = await supabaseFetch(env, '/submissions', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      assignment_id: payload.assignmentId,
      user_id: user.id,
      repo_url: payload.repoUrl,
      status: 'QUEUED'
    })
  });

  const body = await response.json();
  const [record] = z.array(submissionRecord).parse(body);
  return toSubmission(record);
};

export const listSubmissions = async (
  env: WorkerBindings,
  assignmentId: string,
  user: AuthenticatedUser
): Promise<Submission[]> => {
  const assignmentFilter = encodeURIComponent(assignmentId);
  const baseQuery = `?assignment_id=eq.${assignmentFilter}&order=created_at.desc`;
  const query =
    user.role === 'INSTRUCTOR'
      ? `${baseQuery}&select=*`
      : `${baseQuery}&select=*&user_id=eq.${encodeURIComponent(user.id)}`;

  const response = await supabaseFetch(env, '/submissions', {
    method: 'GET',
    search: query
  });
  const data = await response.json();
  return z.array(submissionRecord).parse(data).map(toSubmission);
};

export const findGradeBySubmission = async (
  env: WorkerBindings,
  submissionId: string,
  user: AuthenticatedUser
): Promise<Grade | null> => {
  const response = await supabaseFetch(env, '/grades', {
    method: 'GET',
    search: `?submission_id=eq.${encodeURIComponent(submissionId)}&select=id,submission_id,rubric_json,total_score,graded_at,submission:submissions(user_id)&limit=1`
  });

  const data = await response.json();
  const parsed = z.array(gradeRecord).parse(data);
  if (parsed.length === 0) {
    return null;
  }

  const record = parsed[0];
  if (user.role !== 'INSTRUCTOR' && record?.submission?.user_id !== user.id) {
    return null;
  }

  return toGrade(record);
};

export const listAssignments = async (env: WorkerBindings): Promise<Assignment[]> => {
  const response = await supabaseFetch(env, '/assignments', {
    method: 'GET',
    search: '?select=*&order=due_at.asc'
  });
  const data = await response.json();
  return z.array(assignmentRecord).parse(data).map(toAssignment);
};

export const createAssignment = async (
  env: WorkerBindings,
  user: AuthenticatedUser,
  payload: AssignmentPayload
): Promise<Assignment> => {
  const response = await supabaseFetch(env, '/assignments', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description ?? '',
      due_at: payload.dueAt,
      created_by: user.id
    })
  });

  const data = await response.json();
  const [record] = z.array(assignmentRecord).parse(data);
  return toAssignment(record);
};
