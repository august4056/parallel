import { describe, expect, it, vi, afterEach } from 'vitest';
import app from './index';

const mockEnv = {
  SUPABASE_URL: 'https://example-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key'
} as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /assignments', () => {
  it('returns assignments fetched from Supabase', async () => {
    const fakeAssignments = [
      {
        id: '1',
        title: 'Intro',
        description: 'Getting started',
        due_at: new Date().toISOString(),
        created_by: 'instructor-1',
        created_at: new Date().toISOString()
      }
    ];

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(fakeAssignments), { status: 200 }));

    const request = new Request('https://worker.dev/assignments', { method: 'GET' });
    const response = await app.fetch(request, mockEnv, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ id: '1', title: 'Intro' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example-project.supabase.co/rest/v1/assignments?select=*&order=due_at.asc',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
