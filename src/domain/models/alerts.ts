export type AlertSeverity = "high" | "medium" | "low";

export type AlertState = "Active" | "Acknowledged" | "Resolved";

export interface FleetAlert {
  id: string;
  severity: AlertSeverity;
  vehicleId?: string;
  vehicleName: string;
  type: string;
  rule: string;
  timeIso: string;
  state: AlertState;
  sourceAttribute?: string;
  sourceValue?: string | number | boolean;
  speedKph?: number;
}
