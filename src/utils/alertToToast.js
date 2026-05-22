import { showSuccess, showError, showInfo } from './toastHelpers';

const originalAlert = window.alert;

function classifyMessage(text) {
  const t = String(text || '').toLowerCase();
  if (/success|saved|submitted|posted|copied|approved|created|enrolled|joined|approved!/i.test(t)) return 'success';
  if (/failed|fail|error|invalid|could not|unable|missing|reject|unauthenticated|not authenticated|please sign in|please log in/i.test(t)) return 'error';
  return 'info';
}

function alertToToast(message) {
  try {
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    const kind = classifyMessage(text);
    if (kind === 'success') showSuccess(text);
    else if (kind === 'error') showError(text);
    else showInfo(text);
  } catch (e) {
    // Fallback to original alert if something goes wrong
    originalAlert(message);
  }
}

window.alert = alertToToast;

export function restoreAlert() {
  window.alert = originalAlert;
}

export default alertToToast;
