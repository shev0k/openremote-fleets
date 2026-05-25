import { AlertState, FleetAlert } from "../../../domain/models/alerts";
import { AlertsRepository } from "../../../domain/repositories/alertsRepository";
import { cloneFixture } from "./fixtures/cloneFixture";
import { MOCK_ALERT_FIXTURES } from "./fixtures/alertsFixtures";
import { getCurrentMockDateKey, rebaseIsoTimestampDate } from "./mockDateRebase";

function rebaseAlertToDate(alert: FleetAlert, targetDateIso: string): FleetAlert {
  return {
    ...alert,
    timeIso: rebaseIsoTimestampDate(alert.timeIso, targetDateIso),
  };
}

export class MockAlertsRepository implements AlertsRepository {
  private alerts: FleetAlert[];

  constructor(seedAlerts: FleetAlert[] = MOCK_ALERT_FIXTURES) {
    this.alerts = cloneFixture(seedAlerts);
  }

  async listAlerts(): Promise<FleetAlert[]> {
    const todayIso = getCurrentMockDateKey();
    return cloneFixture(this.alerts.map((alert) => rebaseAlertToDate(alert, todayIso)));
  }

  async updateAlertState(alertId: string, state: AlertState): Promise<void> {
    this.alerts = this.alerts.map((alert) => (alert.id === alertId ? { ...alert, state } : alert));
  }
}
