export function getBrowserLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalStorageItem(key: string): string | null {
  try {
    return getBrowserLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string): void {
  try {
    getBrowserLocalStorage()?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    getBrowserLocalStorage()?.removeItem(key);
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function isPlainStorageObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseStoredJson<TValue>(rawValue: string | null | undefined, guard: (value: unknown) => value is TValue): TValue | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
