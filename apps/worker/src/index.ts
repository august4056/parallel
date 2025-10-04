import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { verifySupabaseJwt, AuthenticationError } from './auth';
import { AuthorizationError, BadRequestError } from './errors';
import { logError, logInfo } from './logger';
import {
  createAssignment,
  createSubmission,
  findGradeBySubmission,
  listAssignments,
  listSubmissions
} from './supabase';
import {
  assignmentBodySchema,
  assignmentQuerySchema,
  gradeParamSchema,
  submissionBodySchema
} from './schema';
import type { ContextVariables, WorkerBindings } from './types';

const app = new Hono<{ Bindings: WorkerBindings; Variables: ContextVariables }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

app.use('*', async (c, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    const durationMs = Date.now() - start;
    logInfo('request.completed', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs
    });
  }
});

const extractBearer = (header: string | undefined) => {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!token || type.toLowerCase() !== 'bearer') {
    return null;
  }
  return token;
};

const requireAuth: Parameters<typeof app.use>[1] = async (c, next) => {
  const token = extractBearer(c.req.header('authorization'));
  if (!token) {
    throw new AuthenticationError();
  }

  const user = await verifySupabaseJwt(token, c.env);
  c.set('user', user);
  await next();
};

const optionalAuth: Parameters<typeof app.use>[1] = async (c, next) => {
  const token = extractBearer(c.req.header('authorization'));
  if (!token) {
    await next();
    return;
  }

  const user = await verifySupabaseJwt(token, c.env);
  c.set('user', user);
  await next();
};

app.get('/health', (c) => c.json({ status: 'ok' }));

app.post('/submissions', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthenticationError();
  }
  if (user.role !== 'STUDENT') {
    throw new AuthorizationError('Only students can submit assignments');
  }

  const payload = submissionBodySchema.parse(await c.req.json());
  const submission = await createSubmission(c.env, user, payload);
  logInfo('submission.created', { submissionId: submission.id, userId: user.id });
  return c.json(submission, 201);
});

app.get('/submissions', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthenticationError();
  }
  const parsed = assignmentQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new BadRequestError('assignmentId is required and must be a UUID');
  }

  const submissions = await listSubmissions(c.env, parsed.data.assignmentId, user);
  return c.json(submissions);
});

app.get('/grades/:submissionId', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthenticationError();
  }
  const params = gradeParamSchema.parse(c.req.param());
  const grade = await findGradeBySubmission(c.env, params.submissionId, user);
  if (!grade) {
    return c.json({ error: 'Grade not found' }, 404);
  }
  return c.json(grade);
});

app.get('/assignments', optionalAuth, async (c) => {
  const assignments = await listAssignments(c.env);
  return c.json(assignments);
});

app.post('/assignments', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new AuthenticationError();
  }
  if (user.role !== 'INSTRUCTOR') {
    throw new AuthorizationError('Only instructors can create assignments');
  }

  const payload = assignmentBodySchema.parse(await c.req.json());
  const assignment = await createAssignment(c.env, user, payload);
  logInfo('assignment.created', { assignmentId: assignment.id, userId: user.id });
  return c.json(assignment, 201);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return c.json({ error: error.flatten() }, 400);
  }
  if (error instanceof AuthenticationError || (typeof error === 'object' && error !== null && 'statusCode' in error)) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (status >= 500) {
      logError('request.error', { message, status });
    }
    return c.json({ error: message }, status);
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  logError('request.unhandled_error', { message });
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
