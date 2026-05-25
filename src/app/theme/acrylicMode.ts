export const THEME_STORAGE_KEY = "openremote-theme";
export const ACRYLIC_MODE_STORAGE_KEY = "openremote-acrylic-mode";
export const ACRYLIC_MODE_OVERRIDE_STORAGE_KEY = "openremote-acrylic-mode-override";
export const ACRYLIC_MODE_SYNC_EVENT = "openremote:acrylic-mode-sync";

export type AcrylicModePreference = "acrylic" | "solid";

function normalizeTheme(theme: string | null | undefined) {
  return theme === "light" ? "light" : "dark";
}

function getAcrylicModeStorageKey(theme: string | null | undefined) {
  return `${ACRYLIC_MODE_STORAGE_KEY}:${normalizeTheme(theme)}`;
}

export function resolveDefaultAcrylicMode(theme: string | null | undefined) {
  return theme !== "light";
}

function readThemeFromStorage(storage: Storage): string | null {
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readStoredAcrylicPreference(storage: Storage, theme: string | null | undefined = readThemeFromStorage(storage)) {
  try {
    const value = storage.getItem(getAcrylicModeStorageKey(theme));
    return value === "acrylic" || value === "solid" ? value : null;
  } catch {
    return null;
  }
}

export function readAcrylicModeOverride(storage: Storage) {
  try {
    const value = storage.getItem(ACRYLIC_MODE_OVERRIDE_STORAGE_KEY);
    return value === "acrylic" || value === "solid" ? value : null;
  } catch {
    return null;
  }
}

export function readAcrylicMode(storage: Storage, theme: string | null | undefined = readThemeFromStorage(storage)) {
  const override = readAcrylicModeOverride(storage);
  if (override) {
    return override === "acrylic";
  }

  const preference = readStoredAcrylicPreference(storage, theme);
  if (preference) {
    return preference === "acrylic";
  }

  return resolveDefaultAcrylicMode(theme);
}

export function writeAcrylicModePreference(storage: Storage, enabled: boolean, theme: string | null | undefined = readThemeFromStorage(storage)) {
  try {
    // Remove the legacy global key when writing theme-specific preferences.
    storage.removeItem(ACRYLIC_MODE_STORAGE_KEY);
    storage.setItem(getAcrylicModeStorageKey(theme), enabled ? "acrylic" : "solid");
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function clearAcrylicModePreference(storage: Storage, theme: string | null | undefined = readThemeFromStorage(storage)) {
  try {
    storage.removeItem(getAcrylicModeStorageKey(theme));
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function writeAcrylicModeOverride(storage: Storage, enabled: boolean) {
  try {
    storage.setItem(ACRYLIC_MODE_OVERRIDE_STORAGE_KEY, enabled ? "acrylic" : "solid");
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function clearAcrylicModeOverride(storage: Storage) {
  try {
    storage.removeItem(ACRYLIC_MODE_OVERRIDE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private mode or locked-down embedded browsers.
  }
}

export function dispatchAcrylicModeSync(target: Window) {
  target.dispatchEvent(new Event(ACRYLIC_MODE_SYNC_EVENT));
}
