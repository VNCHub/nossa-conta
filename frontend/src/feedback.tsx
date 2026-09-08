import { useState, type ReactNode } from 'react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';

/**
 * Write feedback, centralized.
 *
 * Before this, saving an entry gave no feedback and "Delete" removed on the
 * click. On a screen where people check how much each one owes, deleting by
 * accident and not noticing is the worst possible defect.
 */

export const notifySuccess = (message: string) =>
  notifications.show({ message, color: 'petrol', autoClose: 3000 });

export const notifyError = (message: string) =>
  notifications.show({
    title: 'Não deu certo',
    message,
    color: 'brick',
    autoClose: 6000,
  });

export function confirmDelete(options: {
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title: options.title,
    children: options.description,
    labels: { confirm: 'Excluir', cancel: 'Cancelar' },
    confirmProps: { color: 'brick' },
    onConfirm: options.onConfirm,
  });
}

const CRITICAL_MODAL_ID = 'confirm-critical';

/**
 * For actions that destroy shared data or cut someone's access. Spells out the
 * consequences in the body and, when `requireText` is set, keeps the confirm
 * button locked until the person types that exact text (usually the family
 * name) — a deliberate speed bump, not a formality.
 */
export function confirmCritical(options: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  requireText?: string;
  onConfirm: () => void;
}) {
  modals.open({
    modalId: CRITICAL_MODAL_ID,
    title: options.title,
    children: (
      <CriticalBody
        body={options.body}
        confirmLabel={options.confirmLabel}
        requireText={options.requireText}
        onConfirm={() => {
          modals.close(CRITICAL_MODAL_ID);
          options.onConfirm();
        }}
      />
    ),
  });
}

function CriticalBody({
  body,
  confirmLabel,
  requireText,
  onConfirm,
}: {
  body: ReactNode;
  confirmLabel: string;
  requireText?: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const locked = requireText ? typed.trim() !== requireText.trim() : false;

  return (
    <Stack gap="md">
      {body}
      {requireText && (
        <TextInput
          data-autofocus
          label={`Digite “${requireText}” para confirmar`}
          value={typed}
          onChange={(e) => setTyped(e.currentTarget.value)}
        />
      )}
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => modals.close(CRITICAL_MODAL_ID)}>
          Cancelar
        </Button>
        <Button color="brick" disabled={locked} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  );
}
