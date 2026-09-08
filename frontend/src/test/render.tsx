import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../theme/theme';

/**
 * Renders a component inside the same providers `main.tsx` mounts, so a
 * regression test sees what the app sees. `route` seeds the URL for anything
 * that reads search params (the month lives there).
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {children}
      </MemoryRouter>
    </MantineProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
