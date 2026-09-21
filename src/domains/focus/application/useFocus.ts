import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useAppServices } from '@/app/AppServices';
import type { FocusId, FocusTarget } from '../domain/focus';
import { addFocus, moveFocus, removeFocus } from './focusUseCases';

/** Focus épinglés, dans l'ordre, toujours à jour. `undefined` tant que la base n'a pas répondu. */
export function useFocuses() {
  const { focus } = useAppServices();
  return useLiveQuery(() => focus.list(), [focus]);
}

export function useFocusActions() {
  const { focus, now } = useAppServices();
  return {
    add: useCallback((target: FocusTarget) => addFocus(focus, target, now()), [focus, now]),
    remove: useCallback((id: FocusId) => removeFocus(focus, id, now()), [focus, now]),
    move: useCallback(
      (id: FocusId, direction: 'up' | 'down') => moveFocus(focus, id, direction, now()),
      [focus, now],
    ),
  };
}
