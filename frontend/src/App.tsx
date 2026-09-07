import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import SemFamilia from './pages/SemFamilia';
import PainelFamilia from './pages/PainelFamilia';
import MeuPainel from './pages/MeuPainel';
import Gastos from './pages/Gastos';
import Entradas from './pages/Entradas';
import Familia from './pages/Familia';

export default function App() {
  const { usuario, carregando } = useAuth();

  // Enquanto o refresh não responde, não dá para saber se há sessão — mostrar o
  // login aqui faria a tela piscar para quem já estava logado.
  if (carregando) {
    return (
      <div className="gf login">
        <p className="sub">Carregando…</p>
      </div>
    );
  }

  if (!usuario) return <Login />;
  if (!usuario.familiaId) return <SemFamilia />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<PainelFamilia />} />
        <Route path="meu-painel" element={<MeuPainel />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="entradas" element={<Entradas />} />
        <Route path="familia" element={<Familia />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
