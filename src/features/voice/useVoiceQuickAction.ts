import { useEffect } from 'react';

const QUICK_ACTION_PARAM = 'action';
const QUICK_ACTION_VALUE = 'voice';

export function useVoiceQuickAction(onTrigger: () => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const actionValue = params.get(QUICK_ACTION_PARAM);

    if (actionValue === QUICK_ACTION_VALUE) {
      onTrigger();
      params.delete(QUICK_ACTION_PARAM);
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState(window.history.state, '', newUrl);
    }
  }, [onTrigger]);
}
