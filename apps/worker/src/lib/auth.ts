import { jwtVerify } from 'jose';
import { userRoleEnum } from '@launchpad/shared';
import type { AuthenticatedUser } from '../types';
import { z } from 'zod';

const supabaseJwtSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.string().optional(),
  app_metadata: z
    .object({
      role: z.string().optional()
    })
    .partial()
    .optional(),
  user_metadata: z
    .object({
      role: z.string().optional()
    })
    .partial()
    .optional()
});

const textEncoder = new TextEncoder();

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export const verifySupabaseJwt = async (token: string, jwtSecret: string): Promise<AuthenticatedUser> => {
  if (!jwtSecret) {
    throw new UnauthorizedError('Missing Supabase JWT secret.');
  }

  let payload: unknown;

  try {
    const secret = textEncoder.encode(jwtSecret);
    const verification = await jwtVerify(token, secret, {
      algorithms: ['HS256']
    });
    payload = verification.payload;
  } catch (error) {
    throw new UnauthorizedError((error as Error).message);
  }

  const claims = supabaseJwtSchema.parse(payload);
  const roleCandidate =
    claims.app_metadata?.role ?? claims.user_metadata?.role ?? claims.role ?? 'STUDENT';
  const role = userRoleEnum.parse(roleCandidate);

  return {
    id: claims.sub,
    email: claims.email,
    role
  } satisfies AuthenticatedUser;
};
