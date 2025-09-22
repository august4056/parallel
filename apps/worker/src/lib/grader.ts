import type { Submission } from '@launchpad/shared';
import type { WorkerBindings } from '../types';

export const dispatchGraderJob = async (
  env: WorkerBindings,
  submission: Submission
): Promise<void> => {
  if (!env.GRADER_DISPATCH_URL) {
    console.warn('GRADER_DISPATCH_URL is not configured. Skipping grader trigger.');
    return;
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (env.GRADER_AUTH_TOKEN) {
    headers.set('Authorization', `Bearer ${env.GRADER_AUTH_TOKEN}`);
  }

  const payload = {
    submissionId: submission.id,
    assignmentId: submission.assignmentId,
    repoUrl: submission.repoUrl,
    userId: submission.userId
  };

  const response = await fetch(env.GRADER_DISPATCH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to dispatch grader job: ${message}`);
  }
};
