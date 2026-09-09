import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionDTO } from '@shared/contracts';
import { api, onExpired, setToken } from '../api/client';

type User = SessionDTO['user'];

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    inviteCode?: string;
    familyName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const apply = useCallback((session: SessionDTO) => {
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  // On app open, try to bring the session back from the httpOnly refresh cookie.
  useEffect(() => {
    let active = true;
    void (async () => {
      const refreshed = await api.refreshSession();
      if (!active) return;
      if (refreshed) {
        try {
          setUser(await api.get<User>('/auth/me'));
        } catch {
          clear();
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [clear]);

  useEffect(() => onExpired(clear), [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email, password, rememberMe = false) =>
        apply(await api.post<SessionDTO>('/auth/login', { email, password, rememberMe })),
      signUp: async (data) =>
        apply(await api.post<SessionDTO>('/auth/register', data)),
      signOut: async () => {
        await api.post('/auth/logout').catch(() => undefined);
        clear();
      },
      reloadUser: async () => setUser(await api.get<User>('/auth/me')),
    }),
    [user, loading, apply, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider.');
  return ctx;
}
