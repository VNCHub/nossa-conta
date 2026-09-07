import { useState, type FormEvent } from 'react';
import type { TipoEntrada } from '@shared/dominio';
import { brl, mesLabel } from '@shared/formato';
import { api } from '../api/client';
import { chaves, useEntradas, useMutacao } from '../api/hooks';
import { Cabecalho, Carregando, Erro } from '../components/ui';
import { useMes } from '../useMes';

export default function Entradas() {
  const [mes] = useMes();
  const entradas = useEntradas();

  const [tipo, setTipo] = useState<TipoEntrada>('recorrente');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [diaDoMes, setDiaDoMes] = useState('5');
  const [data, setData] = useState(`${mes}-15`);
  const [erro, setErro] = useState('');

  const invalidar = [chaves.entradas, chaves.consolidado(mes)];
  const criar = useMutacao(
    (corpo: Record<string, unknown>) => api.post('/entradas', corpo),
    invalidar,
    {
      onSuccess: () => {
        setDescricao('');
        setValor('');
      },
    },
  );
  const remover = useMutacao((id: string) => api.delete(`/entradas/${id}`), invalidar);

  if (entradas.isPending) return <Carregando />;
  if (entradas.error) return <div className="empty">{entradas.error.message}</div>;

  const recorrentes = entradas.data.filter((e) => e.tipo === 'recorrente');
  const pontuais = entradas.data.filter(
    (e) => e.tipo === 'pontual' && (e.data ?? '').slice(0, 7) === mes,
  );
  const total =
    recorrentes.reduce((s, e) => s + e.valor, 0) + pontuais.reduce((s, e) => s + e.valor, 0);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    const n = Number(valor.replace(',', '.'));
    if (!descricao.trim() || !n || n <= 0) {
      return setErro('Preencha a descrição e um valor maior que zero.');
    }
    criar.mutate(
      {
        tipo,
        descricao: descricao.trim(),
        valor: Math.round(n * 100) / 100,
        ...(tipo === 'recorrente' ? { diaDoMes: Number(diaDoMes) || 1 } : { data }),
      },
      { onError: (e) => setErro(e.message) },
    );
  };

  return (
    <>
      <Cabecalho
        titulo="Minhas entradas"
        descricao="Recorrentes valem todo mês. Pontuais entram só no mês da data."
        acao={
          <div style={{ textAlign: 'right' }}>
            <div className="faint">Total em {mesLabel(mes)}</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{brl(total)}</div>
          </div>
        }
      />

      <form className="card" onSubmit={enviar}>
        <h3 style={{ marginBottom: 14 }}>Lançar entrada</h3>
        <div className="formgrid">
          <div>
            <label className="f" htmlFor="tipo">Tipo</label>
            <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEntrada)}>
              <option value="recorrente">Recorrente</option>
              <option value="pontual">Pontual</option>
            </select>
          </div>
          <div className="span2">
            <label className="f" htmlFor="desc">Descrição</label>
            <input
              id="desc" value={descricao} placeholder="Salário, freela, aluguel recebido…"
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="valor">Valor</label>
            <input
              id="valor" type="number" step="0.01" min="0" placeholder="0,00"
              value={valor} onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            {tipo === 'recorrente' ? (
              <>
                <label className="f" htmlFor="dia">Dia do mês</label>
                <input
                  id="dia" type="number" min="1" max="31" value={diaDoMes}
                  onChange={(e) => setDiaDoMes(e.target.value)}
                />
              </>
            ) : (
              <>
                <label className="f" htmlFor="dt">Data</label>
                <input id="dt" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn" type="submit" disabled={criar.isPending}>
              {criar.isPending ? 'Salvando…' : 'Adicionar entrada'}
            </button>
          </div>
          <div className="span4"><Erro>{erro}</Erro></div>
        </div>
      </form>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Recorrentes</h3>
          {recorrentes.length === 0 ? (
            <div className="empty">Nenhuma entrada recorrente ainda.</div>
          ) : (
            recorrentes.map((e) => (
              <div className="memberrow" key={e.id}>
                <span style={{ flex: 1 }}>
                  {e.descricao}
                  <span className="faint" style={{ display: 'block' }}>todo dia {e.diaDoMes}</span>
                </span>
                <span className="num" style={{ fontWeight: 600 }}>{brl(e.valor)}</span>
                <button className="btn ghost sm" onClick={() => remover.mutate(e.id)}>Remover</button>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Pontuais de {mesLabel(mes)}</h3>
          {pontuais.length === 0 ? (
            <div className="empty">Nenhuma entrada pontual neste mês.</div>
          ) : (
            pontuais.map((e) => (
              <div className="memberrow" key={e.id}>
                <span style={{ flex: 1 }}>
                  {e.descricao}
                  <span className="faint" style={{ display: 'block' }}>
                    {(e.data ?? '').split('-').reverse().join('/')}
                  </span>
                </span>
                <span className="num" style={{ fontWeight: 600 }}>{brl(e.valor)}</span>
                <button className="btn ghost sm" onClick={() => remover.mutate(e.id)}>Remover</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
