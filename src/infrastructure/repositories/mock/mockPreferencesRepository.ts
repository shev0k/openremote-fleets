import { DEFAULT_APP_PREFERENCES, type AppPreferences } from "../../../domain/models/preferences";
import type { PreferencesRepository } from "../../../domain/repositories/preferencesRepository";
import {
  APP_MOCK_PREFERENCES_STORAGE_KEY,
  clearStoredPreferences,
  getBrowserPreferencesStorage,
  readStoredPreferences,
  writeStoredPreferences,
  type PreferencesStorage,
} from "../preferencesStorage";

export class MockPreferencesRepository implements PreferencesRepository {
  constructor(private readonly storage: PreferencesStorage | null = getBrowserPreferencesStorage()) {}

  async getPreferences(): Promise<AppPreferences> {
    return readStoredPreferences(DEFAULT_APP_PREFERENCES, this.storage, APP_MOCK_PREFERENCES_STORAGE_KEY) ?? DEFAULT_APP_PREFERENCES;
  }

  async savePreferences(preferences: AppPreferences): Promise<AppPreferences> {
    return writeStoredPreferences(preferences, this.storage, APP_MOCK_PREFERENCES_STORAGE_KEY);
  }

  async resetPreferences(): Promise<AppPreferences> {
    clearStoredPreferences(this.storage, APP_MOCK_PREFERENCES_STORAGE_KEY);
    return DEFAULT_APP_PREFERENCES;
  }
}
