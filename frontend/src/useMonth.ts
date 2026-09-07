import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MONTH_REGEX } from '@shared/domain';
import { currentMonth } from '@shared/format';

/**
 * The selected month lives in the URL. That makes navigation linkable, survives
 * a reload, and the browser back button works as expected.
 */
export function useMonth(): [string, (m: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('mes');
  const month = raw && MONTH_REGEX.test(raw) ? raw : currentMonth();

  const setMonth = useCallback(
    (next: string) => {
      const updated = new URLSearchParams(params);
      updated.set('mes', next);
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  return [month, setMonth];
}
