import { FleetAlert, AlertState } from "../models/alerts";

export interface AlertsRepository {
  listAlerts(): Promise<FleetAlert[]>;
  updateAlertState(alertId: string, state: AlertState): Promise<void>;
}
