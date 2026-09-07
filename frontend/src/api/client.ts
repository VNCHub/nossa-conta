import type { SessaoDTO } from '@shared/contratos';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * O access token vive só em memória: não vai para localStorage, então um script
 * injetado na página não consegue lê-lo. Quem sobrevive ao reload é o refresh
 * token, guardado pelo servidor em cookie httpOnly.
 */
let accessToken: string | null = null;
let aoPerderSessao: (() => void) | null = null;

export const definirToken = (t: string | null) => {
  accessToken = t;
};
export const aoExpirar = (fn: () => void) => {
  aoPerderSessao = fn;
};

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  try {
    const corpo = await resposta.json();
    const m = corpo?.message;
    // O ValidationPipe devolve um array de mensagens; mostramos a primeira.
    if (Array.isArray(m)) return m[0] ?? 'Não foi possível concluir.';
    if (typeof m === 'string') return m;
  } catch {
    /* resposta sem corpo JSON */
  }
  return 'Não foi possível concluir. Tente de novo.';
}

async function enviar<T>(
  caminho: string,
  init: RequestInit,
  jaRenovou = false,
): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  // 401 com token expirado: renova uma única vez e repete a chamada original.
  if (resposta.status === 401 && !jaRenovou && !caminho.startsWith('/auth/')) {
    const renovada = await renovarSessao();
    if (renovada) return enviar<T>(caminho, init, true);
    aoPerderSessao?.();
    throw new ErroApi(401, 'Sessão expirada. Entre de novo.');
  }

  if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDeErro(resposta));
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}

async function renovarSessao(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) return false;
    const sessao: SessaoDTO = await r.json();
    accessToken = sessao.accessToken;
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(caminho: string) => enviar<T>(caminho, { method: 'GET' }),
  post: <T>(caminho: string, corpo?: unknown) =>
    enviar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo ?? {}) }),
  patch: <T>(caminho: string, corpo: unknown) =>
    enviar<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),
  put: <T>(caminho: string, corpo: unknown) =>
    enviar<T>(caminho, { method: 'PUT', body: JSON.stringify(corpo) }),
  delete: <T>(caminho: string) => enviar<T>(caminho, { method: 'DELETE' }),
  renovarSessao,
};
