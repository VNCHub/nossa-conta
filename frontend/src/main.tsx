import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import 'dayjs/locale/pt-br';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import './styles/base.css';

import { AuthProvider } from './auth/AuthContext';
import { tema } from './tema/tema';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados de um mês fechado mudam pouco; refazer a busca a cada foco de aba
      // só gera tráfego. As mutations invalidam o que precisa ser refeito.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={tema} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'pt-br', firstDayOfWeek: 0 }}>
        <Notifications position="top-right" />
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <ModalsProvider labels={{ confirm: 'Confirmar', cancel: 'Cancelar' }}>
              <AuthProvider>
                <App />
              </AuthProvider>
            </ModalsProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
);
