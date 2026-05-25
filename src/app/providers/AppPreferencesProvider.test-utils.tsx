import { ReactNode, useMemo } from "react";
import {
  DEFAULT_APP_PREFERENCES,
  formatTimeByPreference,
  type AppPreferences,
} from "../../domain/models/preferences";
import { AppPreferencesContext, type AppPreferencesContextValue } from "./AppPreferencesProvider";

interface AppPreferencesContextProviderForTestProps {
  children: ReactNode;
  preferences?: AppPreferences;
  value?: Partial<AppPreferencesContextValue>;
}

export function AppPreferencesContextProviderForTest({
  children,
  preferences = DEFAULT_APP_PREFERENCES,
  value,
}: AppPreferencesContextProviderForTestProps) {
  const contextValue = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      isLoading: false,
      error: null,
      savePreferences: async () => undefined,
      resetPreferences: async () => undefined,
      reloadPreferences: async () => undefined,
      formatTime: (date, timeZone) => formatTimeByPreference(date, preferences.behavior.timeFormat, timeZone),
      ...value,
    }),
    [preferences, value],
  );

  return <AppPreferencesContext.Provider value={contextValue}>{children}</AppPreferencesContext.Provider>;
}
