import { useEffect, useState, type ReactNode } from 'react';
import { Button, Group, Stack, TextInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { TrashIcon } from './components/ui';

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
  /** Defaults to "Excluir" — override for a destructive-but-not-quite-delete action, e.g. "Encerrar". */
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title: options.title,
    children: options.description,
    labels: { confirm: options.confirmLabel ?? 'Excluir', cancel: 'Cancelar' },
    confirmProps: { color: 'brick' },
    onConfirm: options.onConfirm,
  });
}

const CHOICE_MODAL_ID = 'confirm-choice';

/**
 * When a single "delete" is ambiguous between more than one distinct,
 * irreversible action (e.g. ending a recurrence here vs. removing its whole
 * history) — one button per choice, each acting immediately, instead of a
 * preliminary yes/no. `delaySeconds` keeps every choice disabled for a beat
 * (a countdown shown right in the label, never a spinner that hides it) so
 * picking one is a deliberate read, not a reflex click.
 */
export function confirmChoice(options: {
  title: string;
  description: ReactNode;
  choices: { label: string; color?: string; onSelect: () => void }[];
  delaySeconds?: number;
}) {
  modals.open({
    modalId: CHOICE_MODAL_ID,
    title: options.title,
    styles: { title: { fontWeight: 700 } },
    children: (
      <ChoiceBody
        description={options.description}
        choices={options.choices}
        delaySeconds={options.delaySeconds ?? 0}
      />
    ),
  });
}

function ChoiceBody({
  description,
  choices,
  delaySeconds,
}: {
  description: ReactNode;
  choices: { label: string; color?: string; onSelect: () => void }[];
  delaySeconds: number;
}) {
  const [remaining, setRemaining] = useState(delaySeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return (
    <Stack gap="md">
      {description}
      <Stack gap="xs">
        {choices.map((c) => (
          <Button
            key={c.label} variant="light" color={c.color ?? 'brick'} fullWidth
            leftSection={<TrashIcon />}
            disabled={remaining > 0}
            onClick={() => {
              modals.close(CHOICE_MODAL_ID);
              c.onSelect();
            }}
          >
            {c.label}{remaining > 0 ? ` (${remaining})` : ''}
          </Button>
        ))}
      </Stack>
      <Group justify="flex-end">
        <Button variant="default" onClick={() => modals.close(CHOICE_MODAL_ID)}>Cancelar</Button>
      </Group>
    </Stack>
  );
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
