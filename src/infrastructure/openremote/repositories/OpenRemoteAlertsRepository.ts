import type { AlertState, FleetAlert } from "../../../domain/models/alerts";
import type { AlertsRepository } from "../../../domain/repositories/alertsRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { OpenRemoteAlertsService, type OpenRemoteAlarmStatus } from "../services/OpenRemoteAlertsService";
import { OpenRemoteRepositoryBase } from "./OpenRemoteRepositoryBase";
import { mapOpenRemoteAlarmToFleetAlert } from "./openRemoteMappers";

const ALERT_STATE_TO_ALARM_STATUS: Record<AlertState, OpenRemoteAlarmStatus> = {
  Active: "OPEN" as OpenRemoteAlarmStatus,
  Acknowledged: "ACKNOWLEDGED" as OpenRemoteAlarmStatus,
  Resolved: "RESOLVED" as OpenRemoteAlarmStatus,
};

export class OpenRemoteAlertsRepository extends OpenRemoteRepositoryBase implements AlertsRepository {
  constructor(
    runtime: OpenRemoteRuntime,
    private readonly alertsService: OpenRemoteAlertsService,
  ) {
    super(runtime);
  }

  async listAlerts(): Promise<FleetAlert[]> {
    return this.withFallback("listAlerts", [], async () => {
      const alarms = await this.alertsService.listAlarms();
      return alarms.map(mapOpenRemoteAlarmToFleetAlert);
    });
  }

  async updateAlertState(alertId: string, state: AlertState): Promise<void> {
    return this.withVoidFallback("updateAlertState", async () => {
      if (typeof this.alertsService.updateAlarmStatus !== "function") {
        return;
      }
      await this.alertsService.updateAlarmStatus(alertId, ALERT_STATE_TO_ALARM_STATUS[state]);
    });
  }
}
