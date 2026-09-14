import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test/render';
import { useMonth } from './useMonth';

function Probe() {
  const [month, setMonth] = useMonth();
  return (
    <div>
      <output data-testid="month">{month}</output>
      <button onClick={() => setMonth('2025-01')}>mudar</button>
    </div>
  );
}

describe('useMonth', () => {
  it('reads the month from the ?mes= query param', () => {
    renderWithProviders(<Probe />, { route: '/gastos?mes=2026-04' });
    expect(screen.getByTestId('month')).toHaveTextContent('2026-04');
  });

  it('falls back to the current month when ?mes= is missing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
    try {
      renderWithProviders(<Probe />, { route: '/gastos' });
      expect(screen.getByTestId('month')).toHaveTextContent('2026-07');
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to the current month when ?mes= is malformed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
    try {
      renderWithProviders(<Probe />, { route: '/gastos?mes=2026-13' });
      expect(screen.getByTestId('month')).toHaveTextContent('2026-07');
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes the new month back so the screen follows it', async () => {
    renderWithProviders(<Probe />, { route: '/gastos?mes=2026-04' });
    await userEvent.click(screen.getByRole('button', { name: 'mudar' }));
    expect(screen.getByTestId('month')).toHaveTextContent('2025-01');
  });

  it('clamps ?mes= to the current month when it is in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1));
    try {
      renderWithProviders(<Probe />, { route: '/gastos?mes=2099-01' });
      expect(screen.getByTestId('month')).toHaveTextContent('2026-07');
    } finally {
      vi.useRealTimers();
    }
  });
});
