/**
 * Peças de UI do protótipo (docs/prototipo.jsx:371-442), sem mudança visual.
 */
import type { ReactNode } from 'react';
import { CATEGORIAS, catOf } from '@shared/dominio';
import { brl, mesLabel, pct, shiftMes } from '@shared/formato';

export interface Membro {
  id: string;
  nome: string;
  cor: string;
}

export function Avatar({ user, lg }: { user: Membro; lg?: boolean }) {
  return (
    <span className={'avatar' + (lg ? ' lg' : '')} style={{ background: user.cor }}>
      {user.nome[0]}
    </span>
  );
}

export function MesNav({
  mes,
  setMes,
}: {
  mes: string;
  setMes: (m: string) => void;
}) {
  return (
    <div className="mesnav">
      <button className="btn ghost sm" onClick={() => setMes(shiftMes(mes, -1))} aria-label="Mês anterior">
        ←
      </button>
      <span className="lbl num">{mesLabel(mes)}</span>
      <button className="btn ghost sm" onClick={() => setMes(shiftMes(mes, 1))} aria-label="Próximo mês">
        →
      </button>
    </div>
  );
}

export function Donut({ fixo, opcional }: { fixo: number; opcional: number }) {
  const total = fixo + opcional || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  const f = (fixo / total) * c;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`${pct(fixo / total)} fixo`}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="#D9A21B" strokeWidth="17" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke="#1F5F52" strokeWidth="17"
          strokeDasharray={`${f} ${c - f}`} transform="rotate(-90 66 66)"
        />
        <text x="66" y="62" textAnchor="middle" fontSize="21" fontFamily="Archivo" fontWeight="600" fill="#12332C">
          {pct(fixo / total)}
        </text>
        <text x="66" y="79" textAnchor="middle" fontSize="11" fontFamily="Archivo" fill="#8B978F">
          fixo
        </text>
      </svg>
      <div className="stack" style={{ gap: 10 }}>
        <div>
          <span className="chip fixo">Gasto fixo</span>
          <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 5 }}>{brl(fixo)}</div>
        </div>
        <div>
          <span className="chip opcional">Gasto opcional</span>
          <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 5 }}>{brl(opcional)}</div>
        </div>
      </div>
    </div>
  );
}

export function Categorias({ mapa }: { mapa: Record<string, number> }) {
  const total = Object.values(mapa).reduce((s, v) => s + v, 0);
  const itens = CATEGORIAS.map((c) => ({ ...c, v: mapa[c.id] || 0 }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);

  if (!itens.length) return <div className="empty">Sem gastos lançados neste mês.</div>;
  return (
    <div>
      {itens.map((c) => (
        <div className="catrow" key={c.id}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.cor, flex: '0 0 8px' }} />
            {c.nome}
          </span>
          <span className="bar">
            <span style={{ width: pct(c.v / total), background: c.cor }} />
          </span>
          <span className="num r" style={{ textAlign: 'right', fontSize: 12.5 }}>
            {pct(c.v / total)} <span className="faint">· {brl(c.v)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChipCategoria({ id }: { id: string }) {
  const c = catOf(id);
  return (
    <span className="chip">
      <span className="sw" style={{ background: c.cor }} />
      {c.nome}
    </span>
  );
}

export function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rowhead">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="sub">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" style={{ color: 'var(--debit)', fontSize: 13, marginTop: 4 }}>
      {children}
    </p>
  );
}

export function Carregando({ children = 'Carregando…' }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}
