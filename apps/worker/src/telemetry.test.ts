import { describe, expect, it, vi, afterEach } from 'vitest';
import app from './index';

const mockEnv = {
  SUPABASE_URL: 'https://example-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('telemetry logging', () => {
  it('emits learning log when assignments are viewed (authenticated)', async () => {
    // mock auth to always return a user
    vi.mock('./auth', async (orig) => ({
      ...(await orig()),
      verifySupabaseJwt: vi.fn().mockResolvedValue({ id: 'user-1', email: 'u@example.com', role: 'STUDENT' })
    }));

    const fakeAssignments = [
      { id: 'a1', title: 'Intro', description: null, due_at: new Date().toISOString(), created_by: 'i1', created_at: new Date().toISOString() }
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(fakeAssignments), { status: 200 }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const request = new Request('https://worker.dev/assignments', {
      method: 'GET',
      headers: { Authorization: 'Bearer token', 'cf-connecting-ip': '203.0.113.1' }
    });
    const response = await app.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(200);

    const entries = logSpy.mock.calls.map((c) => {
      try { return JSON.parse(String(c[0])); } catch { return null; }
    }).filter(Boolean) as any[];

    const learning = entries.find((e) => e?.type === 'learning' && e?.verb === 'viewed');
    expect(learning).toBeTruthy();
    expect(learning.actor.id).toBe('user-1');
    expect(learning.object.objectType).toBe('AssignmentList');
    expect(learning.context.ip).toBe('203.0.113.1');
  });

  it('emits learning + audit logs when submission is created', async () => {
    // mock auth
    vi.mock('./auth', async (orig) => ({
      ...(await orig()),
      verifySupabaseJwt: vi.fn().mockResolvedValue({ id: 'u2', email: 'u2@example.com', role: 'STUDENT' })
    }));

    // supabase createSubmission call
    const created = [{
      id: 's1', user_id: 'u2', assignment_id: 'a1', repo_url: 'https://example.com/repo.zip', status: 'QUEUED',
      score: null, feedback: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(created), { status: 200 }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const request = new Request('https://worker.dev/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: 'Bearer token', 'x-forwarded-for': '198.51.100.5' },
      body: JSON.stringify({ assignmentId: 'a1', repoUrl: 'https://example.com/repo.zip' })
    });
    const response = await app.fetch(request, mockEnv, {} as ExecutionContext);
    expect(response.status).toBe(201);

    const entries = logSpy.mock.calls.map((c) => {
      try { return JSON.parse(String(c[0])); } catch { return null; }
    }).filter(Boolean) as any[];

    const learning = entries.find((e) => e?.type === 'learning' && e?.verb === 'created' && e?.object?.objectType === 'Submission');
    expect(learning).toBeTruthy();
    expect(learning.actor.id).toBe('u2');
    expect(learning.object.id).toBe('s1');

    const audit = entries.find((e) => e?.type === 'audit' && e?.action === 'submission.created');
    expect(audit).toBeTruthy();
    expect(audit.actor.id).toBe('u2');
    expect(audit.resourceId).toBe('s1');
    expect(audit.ip).toBe('198.51.100.5');
  });
});
