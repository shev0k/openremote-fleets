import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from "../../../domain/models/preferences";
import type { PreferencesRepository } from "../../../domain/repositories/preferencesRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import type { OpenRemotePreferencesService } from "../services/OpenRemotePreferencesService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import {
  buildOpenRemotePreferencesStorageKey,
  clearStoredPreferences,
  getBrowserPreferencesStorage,
  readStoredPreferences,
  writeStoredPreferences,
  type PreferencesStorage,
} from "../../repositories/preferencesStorage";
import { createPreferencesFromOpenRemoteConfig } from "./openRemotePreferencesMapper";

type RuntimeWithOptionalConfig = OpenRemoteRuntime & {
  getConfig?: () => { managerUrl?: string };
};

function warnOpenRemotePreferencesFallback(error: unknown) {
  if (import.meta.env.DEV) {
    console.warn("[OpenRemoteRepository] getPreferences failed; returning default Fleets preferences.", error);
  }
}

export class OpenRemotePreferencesRepository extends OpenRemoteRepositoryBase implements PreferencesRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly preferencesService: OpenRemotePreferencesService,
    private readonly storage: PreferencesStorage | null = getBrowserPreferencesStorage(),
  ) {
    super(runtime);
  }

  async getPreferences(): Promise<AppPreferences> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    const session = this.runtime.getSessionSnapshot();
    const configuredManagerUrl = (this.runtime as RuntimeWithOptionalConfig).getConfig?.().managerUrl;
    const managerUrl = this.runtime.getManager().managerUrl ?? configuredManagerUrl ?? null;
    const storageKey = this.getStorageKey(managerUrl, session.realm);
    if (!ready) {
      return readStoredPreferences(DEFAULT_APP_PREFERENCES, this.storage, storageKey) ?? DEFAULT_APP_PREFERENCES;
    }

    try {
      const config = await this.preferencesService.getManagerAppConfig();
      const base = createPreferencesFromOpenRemoteConfig(config, {
        realm: session.realm,
        managerUrl,
      });

      return readStoredPreferences(base, this.storage, storageKey) ?? base;
    } catch (error) {
      warnOpenRemotePreferencesFallback(error);
      return readStoredPreferences(DEFAULT_APP_PREFERENCES, this.storage, storageKey) ?? DEFAULT_APP_PREFERENCES;
    }
  }

  async savePreferences(preferences: AppPreferences): Promise<AppPreferences> {
    return writeStoredPreferences(preferences, this.storage, this.getStorageKey());
  }

  async resetPreferences(): Promise<AppPreferences> {
    clearStoredPreferences(this.storage, this.getStorageKey());
    return this.getPreferences();
  }

  private getStorageKey(managerUrl?: string | null, realm?: string | null) {
    const session = this.runtime.getSessionSnapshot();
    const configuredManagerUrl = (this.runtime as RuntimeWithOptionalConfig).getConfig?.().managerUrl;

    return buildOpenRemotePreferencesStorageKey({
      managerUrl: managerUrl ?? this.runtime.getManager().managerUrl ?? configuredManagerUrl ?? null,
      realm: realm ?? session.realm,
    });
  }
}
