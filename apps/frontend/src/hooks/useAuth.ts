import { useAuthContext } from '../providers/SupabaseProvider';

export const useAuth = () => {
  const context = useAuthContext();
  const isAuthenticated = Boolean(context.session);
  return {
    ...context,
    isAuthenticated,
    userEmail: context.user?.email ?? null
  };
};
