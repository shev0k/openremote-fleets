import {
  DEFAULT_APP_PREFERENCES,
  mergeAppPreferences,
  type AppPreferences,
  type AppPreferencesInput,
} from "../../domain/models/preferences";
import { isPlainStorageObject, parseStoredJson } from "../../app/components/shared/storage/safeStorage";

export const APP_PREFERENCES_STORAGE_KEY = "openremote-fleets-preferences";
export const APP_MOCK_PREFERENCES_STORAGE_KEY = `${APP_PREFERENCES_STORAGE_KEY}:mock`;
export const APP_OPENREMOTE_PREFERENCES_STORAGE_KEY = `${APP_PREFERENCES_STORAGE_KEY}:openRemote`;

export function buildOpenRemotePreferencesStorageKey(options: { managerUrl?: string | null; realm?: string | null }) {
  const managerUrl = options.managerUrl?.trim().replace(/\/+$/, "") || "default-manager";
  const realm = options.realm?.trim() || "master";

  return `${APP_OPENREMOTE_PREFERENCES_STORAGE_KEY}:${encodeURIComponent(managerUrl)}:${encodeURIComponent(realm)}`;
}

export interface PreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getBrowserPreferencesStorage(): PreferencesStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredPreferences(
  base: AppPreferences,
  storage: PreferencesStorage | null = getBrowserPreferencesStorage(),
  storageKey = APP_PREFERENCES_STORAGE_KEY,
): AppPreferences | null {
  try {
    const rawValue = storage?.getItem(storageKey);
    const parsed = parseStoredJson(rawValue, isPlainStorageObject);
    if (!parsed) {
      return null;
    }

    return mergeAppPreferences(base, { ...(parsed as AppPreferencesInput), source: "local" });
  } catch {
    return null;
  }
}

export function writeStoredPreferences(
  preferences: AppPreferences,
  storage: PreferencesStorage | null = getBrowserPreferencesStorage(),
  storageKey = APP_PREFERENCES_STORAGE_KEY,
): AppPreferences {
  const sanitized = mergeAppPreferences(DEFAULT_APP_PREFERENCES, { ...preferences, source: "local" });

  try {
    storage?.setItem(storageKey, JSON.stringify(sanitized));
  } catch {
    // Browser storage can be blocked or quota-limited. Keep preferences usable for the current session.
  }

  return sanitized;
}

export function clearStoredPreferences(
  storage: PreferencesStorage | null = getBrowserPreferencesStorage(),
  storageKey = APP_PREFERENCES_STORAGE_KEY,
) {
  try {
    storage?.removeItem(storageKey);
  } catch {
    // Reset should not fail the app shell when browser storage is unavailable.
  }
}
