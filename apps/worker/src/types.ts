import type { UserRole } from '@launchpad/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface WorkerBindings {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  GRADER_DISPATCH_URL?: string;
  GRADER_AUTH_TOKEN?: string;
}

export interface WorkerVariables {
  user: AuthenticatedUser;
}
