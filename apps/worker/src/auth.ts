import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { AuthenticatedUser, UserRole, WorkerBindings } from './types';

const supabaseClaimSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  role: z.string().optional(),
  aud: z.string().optional(),
  iss: z.string().url().optional(),
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

const roleSchema = z.union([z.literal('STUDENT'), z.literal('INSTRUCTOR')]);

const jwksCache = new Map<string, { loader: ReturnType<typeof createRemoteJWKSet>; expiresAt: number }>();
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class AuthenticationError extends Error {
  statusCode = 401;
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

const getRemoteJwks = (supabaseUrl: string, serviceRoleKey: string) => {
  const normalized = supabaseUrl.replace(/\/$/, '');
  const cacheKey = normalized;
  const cached = jwksCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.loader;
  }

  const jwksUrl = new URL('/auth/v1/keys', normalized);
  const loader = createRemoteJWKSet(jwksUrl, {
    fetcher: async (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set('apikey', serviceRoleKey);
      return fetch(url, { ...init, headers });
    }
  });
  jwksCache.set(cacheKey, { loader, expiresAt: now + JWKS_CACHE_TTL_MS });
  return loader;
};

const resolveRole = (claims: z.infer<typeof supabaseClaimSchema>): UserRole => {
  const candidate =
    claims.app_metadata?.role ??
    claims.user_metadata?.role ??
    claims.role ??
    'STUDENT';
  const parsed = roleSchema.safeParse(candidate);
  if (!parsed.success) {
    return 'STUDENT';
  }
  return parsed.data;
};

export const verifySupabaseJwt = async (
  token: string,
  env: WorkerBindings
): Promise<AuthenticatedUser> => {
  if (!token) {
    throw new AuthenticationError('Missing access token');
  }
  if (!env.SUPABASE_URL) {
    throw new AuthenticationError('Missing Supabase URL');
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AuthenticationError('Missing Supabase service key');
  }

  const jwks = getRemoteJwks(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { payload } = await jwtVerify(token, jwks, {
    algorithms: ['RS256'],
    issuer: new URL('/auth/v1', env.SUPABASE_URL.replace(/\/$/, '')).toString()
  }).catch((error) => {
    throw new AuthenticationError(error instanceof Error ? error.message : 'Invalid token');
  });

  const claims = supabaseClaimSchema.parse(payload);
  const role = resolveRole(claims);

  return {
    id: claims.sub,
    email: claims.email,
    role
  } satisfies AuthenticatedUser;
};
