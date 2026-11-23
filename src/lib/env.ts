// VITE_DEMO=1 builds a self-contained preview: no sign-in, pre-filled sample data.
export const DEMO = import.meta.env?.VITE_DEMO === '1'

/** confirm() that also works where dialogs are blocked (e.g. embedded previews). */
export function ask(message: string): boolean {
  if (DEMO) return true
  try {
    return window.confirm(message)
  } catch {
    return true
  }
}

export function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
export function lsSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* unavailable */
  }
}
