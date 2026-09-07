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
import type { SessaoDTO } from '@shared/contratos';
import { api, aoExpirar, definirToken } from '../api/client';

type Usuario = SessaoDTO['user'];

interface Contexto {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: {
    nome: string;
    email: string;
    senha: string;
    codigoConvite?: string;
    nomeFamilia?: string;
  }) => Promise<void>;
  sair: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
}

const AuthContext = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const qc = useQueryClient();

  const aplicar = useCallback((sessao: SessaoDTO) => {
    definirToken(sessao.accessToken);
    setUsuario(sessao.user);
  }, []);

  const limpar = useCallback(() => {
    definirToken(null);
    setUsuario(null);
    qc.clear();
  }, [qc]);

  // Ao abrir o app, tenta reerguer a sessão pelo cookie httpOnly de refresh.
  useEffect(() => {
    let ativo = true;
    void (async () => {
      const renovou = await api.renovarSessao();
      if (!ativo) return;
      if (renovou) {
        try {
          setUsuario(await api.get<Usuario>('/auth/me'));
        } catch {
          limpar();
        }
      }
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [limpar]);

  useEffect(() => aoExpirar(limpar), [limpar]);

  const valor = useMemo<Contexto>(
    () => ({
      usuario,
      carregando,
      entrar: async (email, senha) =>
        aplicar(await api.post<SessaoDTO>('/auth/login', { email, senha })),
      cadastrar: async (dados) =>
        aplicar(await api.post<SessaoDTO>('/auth/register', dados)),
      sair: async () => {
        await api.post('/auth/logout').catch(() => undefined);
        limpar();
      },
      recarregarUsuario: async () => setUsuario(await api.get<Usuario>('/auth/me')),
    }),
    [usuario, carregando, aplicar, limpar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return ctx;
}
