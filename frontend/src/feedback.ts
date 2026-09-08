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
