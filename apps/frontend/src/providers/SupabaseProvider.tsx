import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
// Local alias to avoid external type dependency during Vercel build
type UserRole = 'STUDENT' | 'INSTRUCTOR';
import { supabaseClient } from '../lib/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  role: UserRole;
  isInitialized: boolean;
  signOut: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmailLink: (email: string) => Promise<void>;
};

const defaultContext: AuthContextValue = {
  session: null,
  user: null,
  accessToken: null,
  role: 'STUDENT',
  isInitialized: false,
  signOut: async () => {},
  signInWithGitHub: async () => {},
  signInWithEmailLink: async () => {}
};

const AuthContext = createContext<AuthContextValue>(defaultContext);

const resolveRole = (user: User | null): UserRole => {
  const metadataRole = (user?.app_metadata?.role ?? user?.user_metadata?.role) as
    | UserRole
    | undefined;
  if (metadataRole === 'INSTRUCTOR' || metadataRole === 'STUDENT') {
    return metadataRole;
  }
  const roles = user?.app_metadata?.roles as UserRole[] | undefined;
  if (roles?.includes('INSTRUCTOR')) {
    return 'INSTRUCTOR';
  }
  if (roles?.includes('STUDENT')) {
    return 'STUDENT';
  }
  return 'STUDENT';
};

export const SupabaseProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setIsInitialized(true);
      })
      .catch(() => {
        setIsInitialized(true);
      });

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const accessToken = session?.access_token ?? null;
  const role = useMemo(() => resolveRole(user), [user]);

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      throw error;
    }
  }, []);

  const signInWithEmailLink = useCallback(async (email: string) => {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true
      }
    });
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      accessToken,
      role,
      isInitialized,
      signOut,
      signInWithGitHub,
      signInWithEmailLink
    }),
    [session, user, accessToken, role, isInitialized, signOut, signInWithGitHub, signInWithEmailLink]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
