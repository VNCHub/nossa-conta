import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MONTH_REGEX } from '@shared/domain';
import { currentMonth } from '@shared/format';

/**
 * The selected month lives in the URL. That makes navigation linkable, survives
 * a reload, and the browser back button works as expected.
 *
 * Never later than the current month — there is no data ahead of "now", and a
 * hand-edited `?mes=` should not be able to push the app there either.
 */
export function useMonth(): [string, (m: string) => void] {
  const [params, setParams] = useSearchParams();
  const max = currentMonth();
  const raw = params.get('mes');
  const month = clampToMax(raw && MONTH_REGEX.test(raw) ? raw : max, max);

  const setMonth = useCallback(
    (next: string) => {
      const updated = new URLSearchParams(params);
      updated.set('mes', clampToMax(next, max));
      setParams(updated, { replace: true });
    },
    [params, setParams, max],
  );

  return [month, setMonth];
}

const clampToMax = (month: string, max: string) => (month > max ? max : month);
