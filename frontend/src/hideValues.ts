import { useSyncExternalStore } from 'react';

/**
 * "Hide values" mode, like banking apps: one switch for the whole app.
 *
 * A module-level store instead of a context so any component can read it
 * without a provider, and it survives route changes by construction. Kept in
 * localStorage (not on the server) because it is about who is looking at this
 * screen, not a preference of the account.
 */
const KEY = 'nossa-conta:hide-values';
const listeners = new Set<() => void>();

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

let hidden = read();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Another tab flipped the switch: follow it, so no tab is left showing values.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    hidden = read();
    listeners.forEach((l) => l());
  });
}

export function setValuesHidden(next: boolean) {
  hidden = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    // Private mode / blocked storage: still works for this page view.
  }
  listeners.forEach((l) => l());
}

export function useValuesHidden(): [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, () => hidden, () => false);
  return [value, () => setValuesHidden(!value)];
}
