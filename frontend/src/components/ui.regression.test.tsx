import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { Categories, CategoryChip, Empty, ExpenseTypeChip, MonthNav } from './ui';

describe('MonthNav', () => {
  it('shows the selected month spelled out', () => {
    renderWithProviders(<MonthNav month="2026-09" setMonth={() => {}} />);
    expect(screen.getByText('setembro de 2026')).toBeInTheDocument();
  });

  it('steps to the previous and next month on the arrows', async () => {
    const setMonth = vi.fn();
    renderWithProviders(<MonthNav month="2026-01" setMonth={setMonth} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(setMonth).toHaveBeenLastCalledWith('2025-12');

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(setMonth).toHaveBeenLastCalledWith('2026-02');
  });
});

describe('Categories', () => {
  it('lists spent categories from largest to smallest and hides the empty ones', () => {
    renderWithProviders(
      <Categories amounts={{ food: 300, car: 100, home: 0 }} />,
    );

    const labels = screen.getAllByText(/^(Comida|Carro|Casa)$/).map((n) => n.textContent);
    expect(labels).toEqual(['Comida', 'Carro']);
    expect(screen.queryByText('Casa')).not.toBeInTheDocument();
  });

  it('shows each category share of the total', () => {
    renderWithProviders(<Categories amounts={{ food: 300, car: 100 }} />);
    // 300 / 400 = 75%, 100 / 400 = 25%
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('renders the empty state when nothing was spent', () => {
    renderWithProviders(<Categories amounts={{}} />);
    expect(screen.getByText('Sem gastos lançados neste mês.')).toBeInTheDocument();
  });
});

describe('CategoryChip', () => {
  it('renders the category name for a known id', () => {
    renderWithProviders(<CategoryChip id="pets" />);
    expect(screen.getByText('Pets')).toBeInTheDocument();
  });

  it('falls back to "Outros" for an unknown id', () => {
    renderWithProviders(<CategoryChip id="???" />);
    expect(screen.getByText('Outros')).toBeInTheDocument();
  });
});

describe('ExpenseTypeChip', () => {
  it('labels a fixed expense', () => {
    renderWithProviders(<ExpenseTypeChip type="fixed" />);
    expect(screen.getByText('Fixo')).toBeInTheDocument();
  });

  it('labels an optional expense', () => {
    renderWithProviders(<ExpenseTypeChip type="optional" />);
    expect(screen.getByText('Opcional')).toBeInTheDocument();
  });

  it('labels a one-off expense', () => {
    renderWithProviders(<ExpenseTypeChip type="oneOff" />);
    expect(screen.getByText('Pontual')).toBeInTheDocument();
  });
});

describe('Empty', () => {
  it('renders its message', () => {
    renderWithProviders(<Empty>Nada por aqui</Empty>);
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });
});

// Guards the assumption other tests lean on: a zeroed category never renders.
it('Categories: a single zeroed category still yields the empty state', () => {
  renderWithProviders(<Categories amounts={{ food: 0 }} />);
  const region = screen.getByText('Sem gastos lançados neste mês.');
  expect(within(region.parentElement as HTMLElement).queryByText('Comida')).not.toBeInTheDocument();
});
