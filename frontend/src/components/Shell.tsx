import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useFamilia } from '../api/hooks';
import { Avatar, MesNav } from './ui';
import { useMes } from '../useMes';

const TELAS = [
  { para: '/', rotulo: 'Painel da família', fim: true },
  { para: '/meu-painel', rotulo: 'Meu painel' },
  { para: '/gastos', rotulo: 'Gastos' },
  { para: '/entradas', rotulo: 'Entradas' },
  { para: '/familia', rotulo: 'Família e rateios' },
];

export default function Shell() {
  const { usuario, sair } = useAuth();
  const { data: familia } = useFamilia();
  const [mes, setMes] = useMes();

  return (
    <div className="gf">
      <div className="shell">
        <nav className="rail">
          <div className="brand">
            Grana a Dois
            <small>{familia?.nome ?? '—'}</small>
          </div>
          <div className="navlist">
            {TELAS.map((t) => (
              <NavLink
                key={t.para}
                to={{ pathname: t.para, search: `?mes=${mes}` }}
                end={t.fim}
                className={({ isActive }) => 'navbtn' + (isActive ? ' on' : '')}
              >
                <span className="dot" />
                {t.rotulo}
              </NavLink>
            ))}
          </div>
          <div className="railfoot">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              {usuario && <Avatar user={usuario} />}
              <span style={{ color: '#fff', fontSize: 13 }}>{usuario?.nome}</span>
            </div>
            <button onClick={() => void sair()}>Sair da conta</button>
          </div>
        </nav>

        <main className="main">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
            <MesNav mes={mes} setMes={setMes} />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
