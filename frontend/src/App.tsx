import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from './auth/AuthContext';
import Shell from './components/Shell';
import Login from './pages/Login';
import NoFamily from './pages/NoFamily';

/**
 * Screens loaded on demand.
 *
 * Both dashboards drag in the charts library (~97 kB compressed) because of the
 * donut. Without this split, whoever opens the expenses screen pays for a chart
 * they will not see.
 */
const FamilyDashboard = lazy(() => import('./pages/FamilyDashboard'));
const MyDashboard = lazy(() => import('./pages/MyDashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Family = lazy(() => import('./pages/Family'));

const Spinner = () => (
  <Center py="xl">
    <Loader color="petrol" />
  </Center>
);

export default function App() {
  const { user, loading } = useAuth();

  // While the refresh has not answered, we cannot know if there is a session —
  // showing the login here would make the screen flash for someone already in.
  if (loading) {
    return (
      <Center mih="100vh">
        <Loader color="petrol" />
      </Center>
    );
  }

  if (!user) return <Login />;
  if (!user.familyId) return <NoFamily />;

  return (
    <Routes>
      <Route
        element={
          <Shell />
        }
      >
        <Route index element={<Suspense fallback={<Spinner />}><FamilyDashboard /></Suspense>} />
        <Route path="meu-painel" element={<Suspense fallback={<Spinner />}><MyDashboard /></Suspense>} />
        <Route path="gastos" element={<Suspense fallback={<Spinner />}><Expenses /></Suspense>} />
        <Route path="entradas" element={<Suspense fallback={<Spinner />}><Income /></Suspense>} />
        <Route path="familia" element={<Suspense fallback={<Spinner />}><Family /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
