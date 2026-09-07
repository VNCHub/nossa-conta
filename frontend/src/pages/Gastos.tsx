import { useMemo, useState, type FormEvent } from 'react';
import { CATEGORIAS, PAGAMENTOS, type CategoriaId, type Pagamento, type TipoGasto } from '@shared/dominio';
import { brl, mesLabel, pct } from '@shared/formato';
import type { GastoDTO } from '@shared/contratos';
import { api } from '../api/client';
import { chaves, useConsolidado, useGastos, useMembros, useMutacao, useRegras } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Cabecalho, Carregando, ChipCategoria, Erro } from '../components/ui';
import { useMes } from '../useMes';

type Filtro = 'todos' | 'meus' | 'divididos';

interface Formulario {
  data: string;
  pagamento: Pagamento;
  categoria: CategoriaId;
  tipoGasto: TipoGasto;
  descricao: string;
  valor: string;
  dividir: boolean;
  participantes: string[];
  regraId: string;
}

export default function Gastos() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const { data: membros } = useMembros();
  const { data: regras } = useRegras();
  const gastos = useGastos(mes);
  const consolidado = useConsolidado(mes);

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [erro, setErro] = useState('');

  const vazio = useMemo<Formulario>(
    () => ({
      data: `${mes}-${String(new Date().getDate()).padStart(2, '0')}`,
      pagamento: 'Crédito',
      categoria: 'comida',
      tipoGasto: 'fixo',
      descricao: '',
      valor: '',
      dividir: false,
      participantes: usuario ? [usuario.id] : [],
      regraId: regras?.[0]?.id ?? '',
    }),
    [mes, usuario, regras],
  );
  const [f, setF] = useState<Formulario>(vazio);
  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const invalidar = [chaves.gastos(mes), chaves.consolidado(mes)];
  const criar = useMutacao(
    (corpo: Omit<GastoDTO, 'id' | 'userId'>) => api.post<GastoDTO>('/gastos', corpo),
    invalidar,
    { onSuccess: () => setF(vazio) },
  );
  const remover = useMutacao((id: string) => api.delete(`/gastos/${id}`), invalidar);

  if (!gastos.data || !membros || !regras) return <Carregando />;

  const membroDe = (id: string) => membros.find((m) => m.id === id);
  const cotasDe = (id: string) =>
    consolidado.data?.linhas.find((l) => l.id === id)?.cotas ?? {};

  const lista = gastos.data.filter((g) => {
    if (filtro === 'meus') return g.userId === usuario?.id;
    if (filtro === 'divididos') return g.dividir;
    return true;
  });
  const total = lista.reduce((s, g) => s + g.valor, 0);

  const toggleParte = (id: string) =>
    set(
      'participantes',
      f.participantes.includes(id)
        ? f.participantes.filter((x) => x !== id)
        : [...f.participantes, id],
    );

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    const valor = Number(f.valor.replace(',', '.'));
    if (!f.descricao.trim() || !valor || valor <= 0) {
      return setErro('Preencha a descrição e um valor maior que zero.');
    }
    if (f.dividir && f.participantes.length === 0) {
      return setErro('Escolha com quem o gasto será dividido.');
    }

    criar.mutate(
      {
        data: f.data,
        pagamento: f.pagamento,
        categoria: f.categoria,
        tipoGasto: f.tipoGasto,
        descricao: f.descricao.trim(),
        valor: Math.round(valor * 100) / 100,
        dividir: f.dividir,
        participantes: f.dividir ? f.participantes : [],
        regraId: f.dividir ? f.regraId : null,
      },
      { onError: (e) => setErro(e.message) },
    );
  };

  return (
    <>
      <Cabecalho
        titulo="Gastos"
        descricao={`Lançamentos da família em ${mesLabel(mes)}.`}
        acao={
          <div style={{ textAlign: 'right' }}>
            <div className="faint">Total listado</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{brl(total)}</div>
          </div>
        }
      />

      <form className="card" onSubmit={enviar}>
        <h3 style={{ marginBottom: 14 }}>Lançar gasto</h3>
        <div className="formgrid">
          <div>
            <label className="f" htmlFor="data">Data</label>
            <input id="data" type="date" value={f.data} onChange={(e) => set('data', e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="pag">Pagamento</label>
            <select id="pag" value={f.pagamento} onChange={(e) => set('pagamento', e.target.value as Pagamento)}>
              {PAGAMENTOS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="f" htmlFor="cat">Categoria</label>
            <select id="cat" value={f.categoria} onChange={(e) => set('categoria', e.target.value as CategoriaId)}>
              {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="f" htmlFor="tipo">Tipo</label>
            <select id="tipo" value={f.tipoGasto} onChange={(e) => set('tipoGasto', e.target.value as TipoGasto)}>
              <option value="fixo">Gasto fixo</option>
              <option value="opcional">Gasto opcional</option>
            </select>
          </div>

          <div className="span2">
            <label className="f" htmlFor="desc">Descrição</label>
            <input
              id="desc" value={f.descricao} placeholder="Aluguel, mercado, cinema…"
              onChange={(e) => set('descricao', e.target.value)}
            />
          </div>
          <div>
            <label className="f" htmlFor="valor">Valor</label>
            <input
              id="valor" type="number" step="0.01" min="0" placeholder="0,00"
              value={f.valor} onChange={(e) => set('valor', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <input
                type="checkbox" style={{ width: 'auto' }} checked={f.dividir}
                onChange={(e) => set('dividir', e.target.checked)}
              />
              Dividir?
            </label>
          </div>

          {f.dividir && (
            <>
              <div className="span2">
                <label className="f">Com quem</label>
                <div className="pillbar">
                  {membros.map((m) => (
                    <button
                      type="button" key={m.id}
                      className={f.participantes.includes(m.id) ? 'on' : ''}
                      onClick={() => toggleParte(m.id)}
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
              </div>
              <div className="span2">
                <label className="f" htmlFor="regra">Rateio</label>
                <select id="regra" value={f.regraId} onChange={(e) => set('regraId', e.target.value)}>
                  {regras.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
                <p className="faint" style={{ marginTop: 4 }}>
                  {regras.find((r) => r.id === f.regraId)?.descricao}
                </p>
              </div>
            </>
          )}

          <div className="span4">
            <button className="btn" type="submit" disabled={criar.isPending}>
              {criar.isPending ? 'Salvando…' : 'Adicionar gasto'}
            </button>
            <Erro>{erro}</Erro>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="rowhead">
          <h3>Lançamentos</h3>
          <div className="pillbar">
            {(['todos', 'meus', 'divididos'] as Filtro[]).map((k) => (
              <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>
                {k === 'todos' ? 'Todos' : k === 'meus' ? 'Meus' : 'Divididos'}
              </button>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">Nenhum gasto neste filtro.</div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Quem pagou</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Tipo</th>
                  <th>Pagamento</th>
                  <th>Divisão</th>
                  <th className="r">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => {
                  const dono = membroDe(g.userId);
                  const cotas = cotasDe(g.id);
                  return (
                    <tr key={g.id}>
                      <td className="num">{g.data.split('-').reverse().join('/')}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {dono && <Avatar user={dono} />}
                          {dono?.nome ?? '—'}
                        </span>
                      </td>
                      <td>{g.descricao}</td>
                      <td><ChipCategoria id={g.categoria} /></td>
                      <td><span className={'chip ' + g.tipoGasto}>{g.tipoGasto === 'fixo' ? 'Fixo' : 'Opcional'}</span></td>
                      <td className="faint">{g.pagamento}</td>
                      <td>
                        {!g.dividir ? (
                          <span className="faint">só de quem pagou</span>
                        ) : (
                          <div className="faint" style={{ lineHeight: 1.6 }}>
                            {g.participantes.map((p) => (
                              <div key={p}>
                                {membroDe(p)?.nome ?? '—'} · {cotas[p] !== undefined ? pct(cotas[p]) : '—'}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="r num" style={{ fontWeight: 600 }}>{brl(g.valor)}</td>
                      <td className="r">
                        {g.userId === usuario?.id && (
                          <button
                            className="btn danger sm"
                            disabled={remover.isPending}
                            onClick={() => remover.mutate(g.id)}
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
