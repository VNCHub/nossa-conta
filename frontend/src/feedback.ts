import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';

/**
 * Feedback de escrita, centralizado.
 *
 * Antes disto, salvar um lançamento não avisava nada e "Excluir" apagava no
 * clique. Numa tela onde as pessoas conferem quanto cada uma deve, apagar sem
 * querer e não perceber é o pior defeito possível.
 */

export const avisarSucesso = (mensagem: string) =>
  notifications.show({ message: mensagem, color: 'petrol', autoClose: 3000 });

export const avisarErro = (mensagem: string) =>
  notifications.show({
    title: 'Não deu certo',
    message: mensagem,
    color: 'tijolo',
    autoClose: 6000,
  });

export function confirmarExclusao(opcoes: {
  titulo: string;
  descricao: string;
  aoConfirmar: () => void;
}) {
  modals.openConfirmModal({
    title: opcoes.titulo,
    children: opcoes.descricao,
    labels: { confirm: 'Excluir', cancel: 'Cancelar' },
    confirmProps: { color: 'tijolo' },
    onConfirm: opcoes.aoConfirmar,
  });
}
