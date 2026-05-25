import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_APP_PREFERENCES,
  buildPreferencesCssVariables,
  formatTimeByPreference,
  type AppPreferences,
} from "../../domain/models/preferences";
import { useAppServices } from "./AppServicesProvider";

export interface AppPreferencesContextValue {
  preferences: AppPreferences;
  isLoading: boolean;
  error: string | null;
  savePreferences: (preferences: AppPreferences) => Promise<void>;
  resetPreferences: () => Promise<void>;
  reloadPreferences: () => Promise<void>;
  formatTime: (value: Date | string | number, timeZone?: string) => string;
}

const defaultContextValue: AppPreferencesContextValue = {
  preferences: DEFAULT_APP_PREFERENCES,
  isLoading: false,
  error: null,
  savePreferences: async () => undefined,
  resetPreferences: async () => undefined,
  reloadPreferences: async () => undefined,
  formatTime: (value, timeZone) => formatTimeByPreference(value, DEFAULT_APP_PREFERENCES.behavior.timeFormat, timeZone),
};

export const AppPreferencesContext = createContext<AppPreferencesContextValue>(defaultContextValue);

function ensureFaviconLink(documentRef: Document) {
  let link = documentRef.querySelector<HTMLLinkElement>("link[rel~='icon']");

  if (!link) {
    link = documentRef.createElement("link");
    link.rel = "icon";
    documentRef.head.appendChild(link);
  }

  return link;
}

function applyPreferencesToDocument(preferences: AppPreferences) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  Object.entries(buildPreferencesCssVariables(preferences)).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  root.dataset.timeFormat = preferences.behavior.timeFormat;
  document.title = preferences.branding.applicationName;

  const faviconUrl = preferences.branding.faviconUrl || DEFAULT_APP_PREFERENCES.branding.faviconUrl;
  const faviconLink = ensureFaviconLink(document);
  faviconLink.href = faviconUrl ?? "/openremote.png";
}

interface AppPreferencesProviderProps {
  children: ReactNode;
}

export function AppPreferencesProvider({ children }: AppPreferencesProviderProps) {
  const { preferencesRepository } = useAppServices();
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const beginRequest = useCallback(() => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);

  const canApplyRequest = useCallback((requestId: number) => isMountedRef.current && requestId === requestIdRef.current, []);

  const reloadPreferences = useCallback(async () => {
    const requestId = beginRequest();
    setLoading(true);
    setError(null);

    try {
      const nextPreferences = await preferencesRepository.getPreferences();
      if (canApplyRequest(requestId)) {
        setPreferences(nextPreferences);
      }
    } catch {
      if (canApplyRequest(requestId)) {
        setPreferences(DEFAULT_APP_PREFERENCES);
        setError("Preferences are temporarily unavailable.");
      }
    } finally {
      if (canApplyRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [beginRequest, canApplyRequest, preferencesRepository]);

  useEffect(() => {
    void reloadPreferences();
  }, [reloadPreferences]);

  useEffect(() => {
    applyPreferencesToDocument(preferences);
  }, [preferences]);

  const savePreferences = useCallback(
    async (nextPreferences: AppPreferences) => {
      const requestId = beginRequest();
      setError(null);

      try {
        const savedPreferences = await preferencesRepository.savePreferences(nextPreferences);
        if (canApplyRequest(requestId)) {
          setPreferences(savedPreferences);
        }
      } catch {
        if (canApplyRequest(requestId)) {
          setError("Preferences could not be saved.");
        }
      } finally {
        if (canApplyRequest(requestId)) {
          setLoading(false);
        }
      }
    },
    [beginRequest, canApplyRequest, preferencesRepository],
  );

  const resetPreferences = useCallback(async () => {
    const requestId = beginRequest();
    setError(null);

    try {
      const resetPreferences = await preferencesRepository.resetPreferences();
      if (canApplyRequest(requestId)) {
        setPreferences(resetPreferences);
      }
    } catch {
      if (canApplyRequest(requestId)) {
        setError("Preferences could not be reset.");
      }
    } finally {
      if (canApplyRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [beginRequest, canApplyRequest, preferencesRepository]);

  const formatTime = useCallback(
    (value: Date | string | number, timeZone?: string) =>
      formatTimeByPreference(value, preferences.behavior.timeFormat, timeZone),
    [preferences.behavior.timeFormat],
  );

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      error,
      savePreferences,
      resetPreferences,
      reloadPreferences,
      formatTime,
    }),
    [error, formatTime, isLoading, preferences, reloadPreferences, resetPreferences, savePreferences],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}
