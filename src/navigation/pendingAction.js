/**
 * A tiny mailbox for actions requested from outside the UI (notification taps
 * while backgrounded). Stored in MMKV so it survives the process boundary.
 */
import { storage } from '../store/preferences';

const KEY = 'pendingAction';

export function setPendingAction(action) {
  storage.set(KEY, String(action));
}

export function takePendingAction() {
  const a = storage.getString(KEY);
  if (a) {
    storage.remove(KEY);
  }
  return a || null;
}
