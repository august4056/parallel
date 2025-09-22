import {
  assignmentSchema,
  createAssignmentInputSchema,
  createSubmissionInputSchema,
  gradeSchema,
  submissionSchema,
  submissionStatusEnum
} from '@launchpad/shared';
import type {
  Assignment,
  CreateAssignmentInput,
  CreateSubmissionInput,
  Grade,
  Submission
} from '@launchpad/shared';
import { z } from 'zod';
import type { AuthenticatedUser, WorkerBindings } from '../types';

const assignmentRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  due_at: z.string(),
  created_by: z.string(),
  created_at: z.string()
});

const submissionRecordSchema = z.object({
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

const gradeRecordSchema = z.object({
  id: z.string(),
  submission_id: z.string(),
  rubric_json: z.unknown().nullable(),
  total_score: z.union([z.number(), z.string()]),
  graded_at: z.string()
});

const gradeWithSubmissionSchema = gradeRecordSchema.extend({
  submission: z
    .object({
      user_id: z.string()
    })
    .optional()
});

type SupabaseRequestInit = RequestInit & { query?: string };

const parseSupabaseError = async (response: Response) => {
  try {
    const body = await response.clone().json();
    if (typeof body === 'string') return body;
    return body?.message ?? body?.error ?? response.statusText;
  } catch (_) {
    return response.statusText;
  }
};

const supabaseFetch = async (
  env: WorkerBindings,
  path: string,
  init: SupabaseRequestInit = {}
): Promise<Response> => {
  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const headers = new Headers(init.headers);
  headers.set('apikey', env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${baseUrl}/rest/v1${path}${init.query ?? ''}`;
  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response));
  }

  return response;
};

const mapAssignment = (record: z.infer<typeof assignmentRecordSchema>): Assignment => {
  return assignmentSchema.parse({
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    dueAt: record.due_at,
    createdBy: record.created_by,
    createdAt: record.created_at
  });
};

const mapSubmission = (record: z.infer<typeof submissionRecordSchema>): Submission => {
  const status = submissionStatusEnum.parse(record.status);
  return submissionSchema.parse({
    id: record.id,
    userId: record.user_id,
    assignmentId: record.assignment_id,
    repoUrl: record.repo_url,
    status,
    score: record.score === null ? null : Number(record.score),
    feedback: record.feedback,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  });
};

const mapGrade = (record: z.infer<typeof gradeRecordSchema>): Grade => {
  return gradeSchema.parse({
    id: record.id,
    submissionId: record.submission_id,
    rubric: record.rubric_json ?? {},
    totalScore: Number(record.total_score),
    gradedAt: record.graded_at
  });
};

export const listAssignments = async (env: WorkerBindings): Promise<Assignment[]> => {
  const response = await supabaseFetch(env, '/assignments', {
    method: 'GET',
    query: '?select=*&order=due_at.asc'
  });
  const data = await response.json();
  return z.array(assignmentRecordSchema).parse(data).map(mapAssignment);
};

export const createAssignment = async (
  env: WorkerBindings,
  user: AuthenticatedUser,
  payload: CreateAssignmentInput
): Promise<Assignment> => {
  const body = createAssignmentInputSchema.parse(payload);
  const response = await supabaseFetch(env, '/assignments', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      title: body.title,
      description: body.description ?? '',
      due_at: body.dueAt,
      created_by: user.id
    })
  });
  const data = await response.json();
  const [record] = z.array(assignmentRecordSchema).min(1).parse(data);
  return mapAssignment(record);
};

export const listSubmissions = async (
  env: WorkerBindings,
  assignmentId: string,
  user: AuthenticatedUser
): Promise<Submission[]> => {
  const assignmentFilter = encodeURIComponent(assignmentId);
  const filters =
    user.role === 'INSTRUCTOR'
      ? `?select=*&assignment_id=eq.${assignmentFilter}&order=created_at.desc`
      : `?select=*&assignment_id=eq.${assignmentFilter}&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`;
  const response = await supabaseFetch(env, '/submissions', {
    method: 'GET',
    query: filters
  });
  const data = await response.json();
  return z.array(submissionRecordSchema).parse(data).map(mapSubmission);
};

export const createSubmission = async (
  env: WorkerBindings,
  user: AuthenticatedUser,
  payload: CreateSubmissionInput
): Promise<Submission> => {
  const body = createSubmissionInputSchema.parse(payload);
  const response = await supabaseFetch(env, '/submissions', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      assignment_id: body.assignmentId,
      user_id: user.id,
      repo_url: body.repoUrl,
      status: 'QUEUED'
    })
  });
  const data = await response.json();
  const [record] = z.array(submissionRecordSchema).min(1).parse(data);
  return mapSubmission(record);
};

export const findGradeBySubmission = async (
  env: WorkerBindings,
  submissionId: string,
  user: AuthenticatedUser
): Promise<Grade | null> => {
  const response = await supabaseFetch(env, '/grades', {
    method: 'GET',
    query: `?select=id,submission_id,rubric_json,total_score,graded_at,submission:submissions(user_id)&submission_id=eq.${encodeURIComponent(
      submissionId
    )}&limit=1`
  });
  const data = await response.json();
  const records = z.array(gradeWithSubmissionSchema).parse(data);
  if (records.length === 0) {
    return null;
  }

  const record = records[0];
  if (user.role !== 'INSTRUCTOR' && record.submission?.user_id !== user.id) {
    return null;
  }

  return mapGrade(record);
};
