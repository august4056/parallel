import type { Context } from 'hono';

export type LearningLog = {
  type: 'learning';
  timestamp: string;
  actor: { id: string };
  verb: 'viewed' | 'created' | 'released';
  object: { id: string; objectType: 'Assignment' | 'AssignmentList' | 'Submission' | 'Grade' };
  context?: { ip?: string; route?: string };
};

export type AuditLog = {
  type: 'audit';
  timestamp: string;
  actor: { id: string };
  action: string; // e.g., 'submission.created', 'grade.released'
  resourceId: string;
  ip?: string;
};

export const getClientIp = (c: Context): string | undefined => {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    undefined
  );
};

export const emitLearning = (event: LearningLog) => {
  console.log(JSON.stringify(event));
};

export const emitAudit = (event: AuditLog) => {
  console.log(JSON.stringify(event));
};
