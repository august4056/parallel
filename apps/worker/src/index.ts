import { Hono } from 'hono';
import { z } from 'zod';
import {
  createAssignment,
  createSubmission,
  findGradeBySubmission,
  listAssignments,
  listSubmissions
} from './lib/supabase';
import {
  createAssignmentInputSchema,
  createSubmissionInputSchema
} from '@launchpad/shared';
import { dispatchGraderJob } from './lib/grader';
import { verifySupabaseJwt, UnauthorizedError } from './lib/auth';
import type { WorkerBindings, WorkerVariables } from './types';

const assignmentQuerySchema = z.object({
  assignmentId: z.string().uuid()
});

const paramSchema = z.object({
  submissionId: z.string().uuid()
});

const app = new Hono<{ Bindings: WorkerBindings; Variables: WorkerVariables }>();

app.get('/health', (c) => c.json({ status: 'ok' }));

app.use('*', async (c, next) => {
  const authorization = c.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authorization.slice('Bearer '.length);

  try {
    const user = await verifySupabaseJwt(token, c.env.SUPABASE_JWT_SECRET);
    c.set('user', user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    return c.json({ error: message }, 401);
  }

  await next();
});

app.post('/submissions', async (c) => {
  const user = c.get('user');
  const payload = createSubmissionInputSchema.parse(await c.req.json());
  const submission = await createSubmission(c.env, user, payload);

  c.executionCtx.waitUntil(
    dispatchGraderJob(c.env, submission).catch((error) => {
      console.error('Failed to trigger grader job', error);
    })
  );

  return c.json(submission, 201);
});

app.get('/submissions', async (c) => {
  const user = c.get('user');
  const parsed = assignmentQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'assignmentId is required and must be a UUID.' }, 400);
  }

  const submissions = await listSubmissions(c.env, parsed.data.assignmentId, user);
  return c.json(submissions);
});

app.get('/grades/:submissionId', async (c) => {
  const user = c.get('user');
  const params = paramSchema.parse(c.req.param());
  const grade = await findGradeBySubmission(c.env, params.submissionId, user);
  if (!grade) {
    return c.json({ error: 'Grade not found' }, 404);
  }

  return c.json(grade);
});

app.post('/assignments', async (c) => {
  const user = c.get('user');
  if (user.role !== 'INSTRUCTOR') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const payload = createAssignmentInputSchema.parse(await c.req.json());
  const assignment = await createAssignment(c.env, user, payload);
  return c.json(assignment, 201);
});

app.get('/assignments', async (c) => {
  const assignments = await listAssignments(c.env);
  return c.json(assignments);
});

app.onError((error, c) => {
  if (error instanceof UnauthorizedError) {
    return c.json({ error: error.message }, 401);
  }

  if (error instanceof z.ZodError) {
    return c.json({ error: error.flatten() }, 400);
  }

  console.error('Unhandled Worker error', error);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
