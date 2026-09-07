import { useState, type FormEvent } from 'react';
import type { RegraDTO } from '@shared/contratos';
import { TIPOS_REGRA, type TipoRegra } from '@shared/dominio';
import { mesLabel, pct } from '@shared/formato';
import { api } from '../api/client';
import { chaves, useFamilia, useMembros, useMutacao, useRegras } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Cabecalho, Carregando, Erro } from '../components/ui';
import { useMes } from '../useMes';

const ROTULO_TIPO: Record<TipoRegra, string> = {
  igual: 'Partes iguais',
  renda: 'Renda recorrente',
  sobra: 'Sobra livre',
  fixo: 'Percentual fixo',
  medidor: 'Medidor mensal',
};

export default function Familia() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const { data: familia } = useFamilia();
  const { data: membros } = useMembros();
  const regras = useRegras();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoRegra>('igual');
  const [unidade, setUnidade] = useState('km');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  const invalidar = [chaves.regras, chaves.consolidado(mes)];
  const criar = useMutacao(
    (corpo: Record<string, unknown>) => api.post<RegraDTO>('/regras', corpo),
    invalidar,
    { onSuccess: () => setNome('') },
  );
  const excluir = useMutacao((id: string) => api.delete(`/regras/${id}`), invalidar);
  const salvarPesos = useMutacao(
    (v: { id: string; pesos: { userId: string; percentual: number }[] }) =>
      api.put<RegraDTO>(`/regras/${v.id}/pesos`, { pesos: v.pesos }),
    invalidar,
  );
  const salvarMedicoes = useMutacao(
    (v: { id: string; medicoes: { userId: string; valor: number }[] }) =>
      api.put<RegraDTO>(`/regras/${v.id}/medicoes?mes=${mes}`, { medicoes: v.medicoes }),
    invalidar,
  );

  if (regras.isPending || !membros || !familia || !usuario) return <Carregando />;
  if (regras.error) return <div className="empty">{regras.error.message}</div>;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(familia.codigoConvite);
    } catch {
      /* sem permissão de área de transferência: o código segue visível na tela */
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const enviarRegra = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) return setErro('Dê um nome à regra.');
    criar.mutate(
      { nome: nome.trim(), tipo, ...(tipo === 'medidor' ? { unidade: unidade.trim() } : {}) },
      { onError: (e) => setErro(e.message) },
    );
  };

  const alterarPeso = (r: RegraDTO, userId: string, valor: string) => {
    const pesos = membros.map((m) => ({
      userId: m.id,
      percentual: m.id === userId ? Number(valor) || 0 : (r.pesos?.[m.id] ?? 0),
    }));
    salvarPesos.mutate({ id: r.id, pesos });
  };

  const alterarMedicao = (r: RegraDTO, userId: string, valor: string) => {
    const doMes = r.medicoes?.[mes] ?? {};
    const medicoes = membros
      .map((m) => ({
        userId: m.id,
        valor: m.id === userId ? Number(valor) || 0 : (doMes[m.id] ?? 0),
      }))
      .filter((m) => m.valor > 0);
    salvarMedicoes.mutate({ id: r.id, medicoes });
  };

  return (
    <>
      <Cabecalho
        titulo={familia.nome}
        descricao="Membros, convite e as regras de rateio que aparecem no formulário de gasto."
      />

      <div className="grid2">
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Membros</h3>
          {membros.map((m) => (
            <div className="memberrow" key={m.id}>
              <Avatar user={m} lg />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontWeight: 600 }}>
                  {m.nome}
                  {m.id === usuario.id ? ' (você)' : ''}
                </strong>
                <span className="faint" style={{ display: 'block' }}>{m.email}</span>
              </span>
              {familia.criadaPorId === m.id && <span className="chip">Criou a família</span>}
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 6 }}>Convidar alguém</h3>
          <p className="sub" style={{ marginBottom: 14 }}>
            Quem tiver esse código entra na família ao criar a conta e passa a ver estes lançamentos.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className="num"
              style={{
                fontSize: 22, fontWeight: 600, letterSpacing: '0.06em',
                background: '#EDF0EB', padding: '10px 16px', borderRadius: 10,
              }}
            >
              {familia.codigoConvite}
            </span>
            <button className="btn ghost" onClick={() => void copiar()}>
              {copiado ? 'Código copiado' : 'Copiar código'}
            </button>
          </div>
          <div className="note" style={{ marginTop: 16 }}>
            Nenhum dado desta família aparece para quem está fora dela: toda consulta da API é
            filtrada pela família de quem está logado.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="rowhead" style={{ marginBottom: 8 }}>
          <div>
            <h3>Regras de rateio</h3>
            <p className="sub">São essas opções que aparecem no campo “Rateio” de cada gasto dividido.</p>
          </div>
        </div>

        <div className="stack" style={{ marginTop: 14 }}>
          {regras.data.map((r) => (
            <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
              <div className="rowhead" style={{ marginBottom: 10 }}>
                <div>
                  <strong style={{ fontWeight: 600, fontSize: 14.5 }}>{r.nome}</strong>
                  <p className="faint">{r.descricao}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="chip">{r.emUso ?? 0} gasto(s) usando</span>
                  {(r.emUso ?? 0) === 0 && regras.data.length > 1 && (
                    <button className="btn danger sm" onClick={() => excluir.mutate(r.id)}>
                      Excluir
                    </button>
                  )}
                </div>
              </div>

              {r.tipo === 'fixo' && (
                <div className="formgrid">
                  {membros.map((m) => (
                    <div key={m.id}>
                      <label className="f">{m.nome} (%)</label>
                      <input
                        type="number" min="0" max="100" defaultValue={r.pesos?.[m.id] ?? 0}
                        onBlur={(e) => alterarPeso(r, m.id, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="span4 faint">
                    Soma atual: {Object.values(r.pesos ?? {}).reduce((s, v) => s + v, 0)}%. Se não fechar
                    100, o app normaliza proporcionalmente entre quem participa do gasto.
                  </div>
                </div>
              )}

              {r.tipo === 'medidor' && (
                <div>
                  <p className="faint" style={{ marginBottom: 10 }}>
                    Medição de {mesLabel(mes)} — unidade: {r.unidade}
                  </p>
                  <div className="formgrid">
                    {membros.map((m) => {
                      const doMes = r.medicoes?.[mes] ?? {};
                      const soma = Object.values(doMes).reduce((s, v) => s + v, 0);
                      return (
                        <div key={m.id}>
                          <label className="f">{m.nome} ({r.unidade})</label>
                          <input
                            type="number" min="0" placeholder="0" defaultValue={doMes[m.id] ?? ''}
                            key={`${r.id}-${m.id}-${mes}-${doMes[m.id] ?? ''}`}
                            onBlur={(e) => alterarMedicao(r, m.id, e.target.value)}
                          />
                          <div className="faint num" style={{ marginTop: 4 }}>
                            {soma ? pct((doMes[m.id] ?? 0) / soma) : 'sem medição'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {['igual', 'renda', 'sobra'].includes(r.tipo) && (
                <p className="faint">
                  Calculada automaticamente a partir dos lançamentos do mês — não precisa configurar.
                </p>
              )}
            </div>
          ))}
        </div>

        <form style={{ borderTop: '1px solid var(--line)', marginTop: 18, paddingTop: 18 }} onSubmit={enviarRegra}>
          <h3 style={{ marginBottom: 12 }}>Criar regra</h3>
          <div className="formgrid">
            <div className="span2">
              <label className="f" htmlFor="rnome">Nome</label>
              <input
                id="rnome" value={nome} placeholder="Ex.: Mercado por pessoa em casa"
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <label className="f" htmlFor="rtipo">Base do cálculo</label>
              <select id="rtipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRegra)}>
                {TIPOS_REGRA.map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
              </select>
            </div>
            {tipo === 'medidor' ? (
              <div>
                <label className="f" htmlFor="runi">Unidade medida</label>
                <input
                  id="runi" value={unidade} placeholder="km, dias, litros…"
                  onChange={(e) => setUnidade(e.target.value)}
                />
              </div>
            ) : (
              <div />
            )}
            <div className="span4">
              <button className="btn" type="submit" disabled={criar.isPending}>
                {criar.isPending ? 'Criando…' : 'Criar regra'}
              </button>
              <Erro>{erro}</Erro>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
