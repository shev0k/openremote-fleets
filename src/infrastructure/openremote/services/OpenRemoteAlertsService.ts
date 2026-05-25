import type { SentAlarm } from "@openremote/model";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";

export type OpenRemoteAlarmStatus = NonNullable<SentAlarm["status"]>;

export class OpenRemoteAlertsService {
  constructor(private readonly runtime: OpenRemoteRuntime) {}

  async listAlarms(): Promise<SentAlarm[]> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return [];
    }

    const response = await this.runtime.getApi().AlarmResource.getAlarms();
    return response.data ?? [];
  }

  async updateAlarmStatus(alertId: string, status: OpenRemoteAlarmStatus): Promise<void> {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      return;
    }

    const numericAlertId = Number(alertId);
    if (!Number.isFinite(numericAlertId)) {
      return;
    }

    const existing = await this.runtime.getApi().AlarmResource.getAlarm(numericAlertId);
    if (!existing.data) {
      return;
    }

    await this.runtime.getApi().AlarmResource.updateAlarm(numericAlertId, {
      ...existing.data,
      status,
    });
  }
}
