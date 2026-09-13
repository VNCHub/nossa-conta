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
import '@mantine/dropzone/styles.css';
import './styles/base.css';

import { AuthProvider } from './auth/AuthContext';
import { theme } from './theme/theme';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A closed month's data changes little; refetching on every tab focus
      // only generates traffic. Mutations invalidate what needs refetching.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
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
