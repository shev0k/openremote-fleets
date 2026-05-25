import type { AppPreferences } from "../models/preferences";

export interface PreferencesRepository {
  getPreferences(): Promise<AppPreferences>;
  savePreferences(preferences: AppPreferences): Promise<AppPreferences>;
  resetPreferences(): Promise<AppPreferences>;
}
