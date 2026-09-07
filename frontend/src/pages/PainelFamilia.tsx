import { brl, mesLabel, pct } from '@shared/formato';
import { useConsolidado, useFamilia, useMembros } from '../api/hooks';
import { Avatar, Cabecalho, Carregando, Categorias, Donut } from '../components/ui';
import { useMes } from '../useMes';

export default function PainelFamilia() {
  const [mes] = useMes();
  const { data: familia } = useFamilia();
  const { data: membros } = useMembros();
  const consolidado = useConsolidado(mes);

  if (consolidado.isPending || !membros || !familia) return <Carregando />;
  if (consolidado.error) return <div className="empty">{consolidado.error.message}</div>;

  const calc = consolidado.data;
  const nomeDe = (id: string) => membros.find((m) => m.id === id)?.nome ?? 'alguém';

  const totalEntradas = membros.reduce((s, u) => s + (calc.porUsuario[u.id]?.entrada ?? 0), 0);
  const maxCota = Math.max(...membros.map((u) => calc.porUsuario[u.id]?.cota ?? 0), 1);

  const catFamilia: Record<string, number> = {};
  let fixoFam = 0;
  let opcFam = 0;
  for (const u of membros) {
    const d = calc.porUsuario[u.id];
    if (!d) continue;
    fixoFam += d.fixo;
    opcFam += d.opcional;
    for (const [k, v] of Object.entries(d.categorias)) catFamilia[k] = (catFamilia[k] ?? 0) + v;
  }

  return (
    <>
      <Cabecalho
        titulo={familia.nome}
        descricao={`Consolidado de ${membros.length} ${membros.length === 1 ? 'pessoa' : 'pessoas'} em ${mesLabel(mes)}.`}
      />

      <div className="card" style={{ background: '#12332C', borderColor: '#12332C', color: '#E7EDE9' }}>
        <div style={{ fontSize: 12.5, color: '#8FAFA4', marginBottom: 10 }}>Acerto do mês</div>
        {calc.transferencias.length === 0 ? (
          <p className="acerto" style={{ color: '#fff' }}>Ninguém deve nada a ninguém.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {calc.transferencias.map((t, i) => (
              <p className="acerto" key={i} style={{ color: '#fff' }}>
                {nomeDe(t.de)} paga <span style={{ color: '#F0C355' }}>{brl(t.valor)}</span> para {nomeDe(t.para)}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="grid3">
        <div className="card">
          <div className="faint">Entrou na casa</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(totalEntradas)}</div>
        </div>
        <div className="card">
          <div className="faint">Gasto total</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(calc.totalMes)}</div>
        </div>
        <div className="card">
          <div className="faint">Sobrou</div>
          <div
            className="num"
            style={{
              fontSize: 26, fontWeight: 600, marginTop: 4,
              color: totalEntradas - calc.totalMes >= 0 ? 'var(--credit)' : 'var(--debit)',
            }}
          >
            {brl(totalEntradas - calc.totalMes)}
          </div>
          <div className="faint" style={{ marginTop: 4 }}>
            {totalEntradas ? pct((totalEntradas - calc.totalMes) / totalEntradas) : '0%'} do que entrou
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Quem recebeu e quem gastou</h3>
        {membros.map((u) => {
          const d = calc.porUsuario[u.id];
          if (!d) return null;
          const saldo = calc.saldo[u.id] ?? 0;
          return (
            <div className="memberrow" key={u.id}>
              <Avatar user={u} lg />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontWeight: 600 }}>{u.nome}</strong>
                <div className="faint">
                  entrada {brl(d.entrada)} · saiu do bolso {brl(d.pago)}
                </div>
                <span className="bar" style={{ display: 'block', marginTop: 6 }}>
                  <span style={{ width: pct(d.cota / maxCota), background: u.cor }} />
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontWeight: 600 }}>{brl(d.cota)}</div>
                <div
                  className="faint num"
                  style={{ color: saldo >= 0 ? 'var(--credit)' : 'var(--debit)' }}
                >
                  {saldo >= 0 ? 'a receber ' : 'a pagar '}
                  {brl(Math.abs(saldo))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 16 }}>Fixo contra opcional na casa</h3>
          <Donut fixo={fixoFam} opcional={opcFam} />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Onde o dinheiro da casa foi</h3>
          <Categorias mapa={catFamilia} />
        </div>
      </div>
    </>
  );
}
