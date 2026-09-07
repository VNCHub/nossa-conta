import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MES_REGEX } from '@shared/dominio';
import { mesAtual } from '@shared/formato';

/**
 * O mês selecionado mora na URL. Assim a navegação é linkável, sobrevive ao
 * reload e o botão de voltar do navegador funciona como se espera.
 */
export function useMes(): [string, (m: string) => void] {
  const [params, setParams] = useSearchParams();
  const bruto = params.get('mes');
  const mes = bruto && MES_REGEX.test(bruto) ? bruto : mesAtual();

  const setMes = useCallback(
    (novo: string) => {
      const proximo = new URLSearchParams(params);
      proximo.set('mes', novo);
      setParams(proximo, { replace: true });
    },
    [params, setParams],
  );

  return [mes, setMes];
}
