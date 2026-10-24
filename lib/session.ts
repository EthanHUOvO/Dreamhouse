const ACTIVE_SESSION_KEY = "dreamhouse:active-session-id";
const SESSION_PREFIX = "dreamhouse:session:";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function createSessionId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `session-${uuid}` : `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getActiveSessionId() {
  if (!canUseStorage()) return null;
  try { return window.sessionStorage.getItem(ACTIVE_SESSION_KEY); } catch { return null; }
}

export function startSession(forceNew = false) {
  if (!canUseStorage()) return "";
  const current = forceNew ? null : getActiveSessionId();
  const id = current || createSessionId();
  try { window.sessionStorage.setItem(ACTIVE_SESSION_KEY, id); } catch { /* private mode may reject storage */ }
  return id;
}

export function sessionStorageKey(sessionId: string, name: string) {
  return `${SESSION_PREFIX}${sessionId}:${name}`;
}

export function sessionPrefix(sessionId: string) {
  return `${SESSION_PREFIX}${sessionId}:`;
}

export function clearSessionStorage(sessionId: string) {
  if (typeof window === "undefined") return;
  const prefix = sessionPrefix(sessionId);
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) window.localStorage.removeItem(key);
    }
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
    if (window.sessionStorage.getItem(ACTIVE_SESSION_KEY) === sessionId) window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* cleanup is best effort; navigation still completes */ }
}
