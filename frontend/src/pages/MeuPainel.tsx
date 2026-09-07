import { brl, mesLabel, pct } from '@shared/formato';
import { useAuth } from '../auth/AuthContext';
import { useConsolidado } from '../api/hooks';
import { Cabecalho, Carregando, Categorias, Donut } from '../components/ui';
import { useMes } from '../useMes';

export default function MeuPainel() {
  const [mes] = useMes();
  const { usuario } = useAuth();
  const consolidado = useConsolidado(mes);

  if (consolidado.isPending || !usuario) return <Carregando />;
  if (consolidado.error) return <div className="empty">{consolidado.error.message}</div>;

  const calc = consolidado.data;
  const d = calc.porUsuario[usuario.id];
  if (!d) return <div className="empty">Sem dados seus neste mês.</div>;

  const sobrou = d.entrada - d.cota;
  const meuSaldo = calc.saldo[usuario.id] ?? 0;
  const parcelaOpcional = d.fixo + d.opcional > 0 ? d.opcional / (d.fixo + d.opcional) : 0;

  return (
    <>
      <Cabecalho
        titulo="Meu painel"
        descricao="Sua cota real: gastos individuais mais a sua parte do que foi dividido."
      />

      <div className="grid3">
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Entrou</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(d.entrada)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Sua cota de gastos</div>
          <div className="num" style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{brl(d.cota)}</div>
          <div className="faint" style={{ marginTop: 4 }}>saiu do seu bolso: {brl(d.pago)}</div>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <div className="faint">Sobrou</div>
          <div
            className="num"
            style={{
              fontSize: 26, fontWeight: 600, marginTop: 4,
              color: sobrou >= 0 ? 'var(--credit)' : 'var(--debit)',
            }}
          >
            {brl(sobrou)}
          </div>
          <div className="faint" style={{ marginTop: 4 }}>
            {d.entrada ? pct(sobrou / d.entrada) : '0%'} da sua entrada
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 16 }}>Fixo contra opcional</h3>
          <Donut fixo={d.fixo} opcional={d.opcional} />
          <p className="faint" style={{ marginTop: 16 }}>
            {parcelaOpcional > 0.35
              ? 'Mais de um terço da sua cota é gasto opcional — é aí que dá pra mexer sem mudar de vida.'
              : 'Sua base fixa domina o mês. Cortar aqui exige renegociar contrato, não só hábito.'}
          </p>
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Onde o dinheiro foi</h3>
          <Categorias mapa={d.categorias} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Seu acerto em {mesLabel(mes)}</h3>
        {Math.abs(meuSaldo) < 0.01 ? (
          <p className="sub">Você está quite com todo mundo neste mês.</p>
        ) : meuSaldo > 0 ? (
          <p className="acerto">
            Você tem <span style={{ color: 'var(--credit)' }}>{brl(meuSaldo)}</span> a receber.
          </p>
        ) : (
          <p className="acerto">
            Você tem <span className="v">{brl(-meuSaldo)}</span> a pagar.
          </p>
        )}
        <p className="faint" style={{ marginTop: 10 }}>
          Diferença entre o que saiu do seu bolso ({brl(d.pago)}) e a sua cota ({brl(d.cota)}).
        </p>
      </div>
    </>
  );
}
