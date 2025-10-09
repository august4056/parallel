export type UserRole = 'STUDENT' | 'INSTRUCTOR';

export interface WorkerBindings {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  createdBy: string;
  createdAt: string;
}

export type SubmissionStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface Submission {
  id: string;
  userId: string;
  assignmentId: string;
  repoUrl: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  submissionId: string;
  rubric: unknown;
  totalScore: number;
  gradedAt: string;
}

export interface ContextVariables {
  user?: AuthenticatedUser;
}

export interface StructuredLog {
  timestamp: string;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  event: string;
  detail?: Record<string, unknown>;
}
