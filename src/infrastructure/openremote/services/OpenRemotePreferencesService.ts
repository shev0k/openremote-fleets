import type { ManagerAppConfig } from "@openremote/model";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";

export class OpenRemotePreferencesService {
  constructor(private readonly runtime: OpenRemoteRuntime) {}

  async getManagerAppConfig(): Promise<ManagerAppConfig | null> {
    const response = await this.runtime.getApi().ConfigurationResource.getManagerConfig();
    return response.status === 200 ? response.data as ManagerAppConfig : null;
  }
}
