import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from './auth/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import SemFamilia from './pages/SemFamilia';

/**
 * Telas carregadas sob demanda.
 *
 * Os dois painéis arrastam a biblioteca de gráficos (~97 kB comprimidos) por
 * causa do donut. Sem esta divisão, quem abre a tela de gastos paga por um
 * gráfico que não vai ver.
 */
const PainelFamilia = lazy(() => import('./pages/PainelFamilia'));
const MeuPainel = lazy(() => import('./pages/MeuPainel'));
const Gastos = lazy(() => import('./pages/Gastos'));
const Entradas = lazy(() => import('./pages/Entradas'));
const Familia = lazy(() => import('./pages/Familia'));

const Girando = () => (
  <Center py="xl">
    <Loader color="petrol" />
  </Center>
);

export default function App() {
  const { usuario, carregando } = useAuth();

  // Enquanto o refresh não responde, não dá para saber se há sessão — mostrar o
  // login aqui faria a tela piscar para quem já estava logado.
  if (carregando) {
    return (
      <Center mih="100vh">
        <Loader color="petrol" />
      </Center>
    );
  }

  if (!usuario) return <Login />;
  if (!usuario.familiaId) return <SemFamilia />;

  return (
    <Routes>
      <Route
        element={
          <Shell />
        }
      >
        <Route index element={<Suspense fallback={<Girando />}><PainelFamilia /></Suspense>} />
        <Route path="meu-painel" element={<Suspense fallback={<Girando />}><MeuPainel /></Suspense>} />
        <Route path="gastos" element={<Suspense fallback={<Girando />}><Gastos /></Suspense>} />
        <Route path="entradas" element={<Suspense fallback={<Girando />}><Entradas /></Suspense>} />
        <Route path="familia" element={<Suspense fallback={<Girando />}><Familia /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
