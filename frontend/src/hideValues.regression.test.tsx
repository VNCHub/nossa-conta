import { afterEach, describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test/render';
import { HideValuesToggle, Metric, Money } from './components/ui';
import { setValuesHidden } from './hideValues';

afterEach(() => {
  act(() => setValuesHidden(false));
  localStorage.clear();
});

describe('hide values', () => {
  it('swaps every amount for a mask and back on the toggle', async () => {
    renderWithProviders(
      <>
        <HideValuesToggle />
        <Metric label="Entrou" value={<Money value={1234.5} />} />
        <Money value={12.9} />
      </>,
    );
    expect(screen.getByText('R$ 1.234,50')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));

    // The amount must leave the DOM, not just be painted over.
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'valor oculto' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Mostrar valores' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar valores' }));
    expect(screen.getByText('R$ 12,90')).toBeInTheDocument();
  });

  it('keeps the choice across remounts (screen changes) and in storage', async () => {
    const first = renderWithProviders(<HideValuesToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar valores' }));
    first.unmount();

    renderWithProviders(<Money value={50} />);
    expect(screen.getByRole('img', { name: 'valor oculto' })).toBeInTheDocument();
    expect(localStorage.getItem('nossa-conta:hide-values')).toBe('1');
  });
});
