import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from '@mantine/form';
import { TextInput } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { renderWithProviders } from '../test/render';
import { FormCancelButton, FormModal, useDirtyGuard } from './FormModal';

function Form({ onSaved }: { onSaved: () => void }) {
  const form = useForm({ mode: 'uncontrolled', initialValues: { name: '' } });
  useDirtyGuard(() => form.isDirty());
  return (
    <form onSubmit={form.onSubmit(onSaved)}>
      <TextInput label="Nome" key={form.key('name')} {...form.getInputProps('name')} />
      <FormCancelButton>Cancelar</FormCancelButton>
      <button type="submit">Salvar</button>
    </form>
  );
}

function setup() {
  const onClose = vi.fn();
  // Saving closes through the plain onClose, like the real forms do.
  renderWithProviders(
    <ModalsProvider>
      <FormModal opened onClose={onClose} title="Teste" transitionProps={{ duration: 0 }}>
        <Form onSaved={onClose} />
      </FormModal>
    </ModalsProvider>,
  );
  return onClose;
}

const type = (text: string) => userEvent.type(screen.getByLabelText('Nome'), text);

describe('FormModal', () => {
  it('closes without asking when nothing was typed', async () => {
    const onClose = setup();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Descartar o que foi preenchido?')).not.toBeInTheDocument();
  });

  it('asks before closing a changed form, and "Continuar editando" keeps the data', async () => {
    const onClose = setup();
    await type('almoço');
    await userEvent.keyboard('{Escape}');

    expect(await screen.findByText('Descartar o que foi preenchido?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome')).toHaveValue('almoço');
  });

  it('closes after "Descartar"', async () => {
    const onClose = setup();
    await type('almoço');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('Cancel on an untouched form closes straight away', async () => {
    const onClose = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closing after a successful save does not ask', async () => {
    const onClose = setup();
    await type('almoço');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Descartar o que foi preenchido?')).not.toBeInTheDocument();
  });
});
