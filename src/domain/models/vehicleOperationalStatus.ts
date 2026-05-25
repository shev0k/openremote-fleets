import type { VehicleStatus } from "./vehicle";

export interface VehicleOperationalStatusInput {
  activeAlertCount?: number | null;
  hasLocation?: boolean;
  ignitionOn?: boolean | null;
  movement?: boolean | null;
  speedKph?: number | null;
  explicitStatus?: VehicleStatus | "online" | "idle" | null;
}

export function deriveVehicleOperationalStatus(input: VehicleOperationalStatusInput): VehicleStatus {
  const activeAlertCount = Math.max(0, input.activeAlertCount ?? 0);
  if (activeAlertCount > 0) {
    return "alerting";
  }

  if (input.explicitStatus === "offline") {
    return "offline";
  }

  const hasSpeed = typeof input.speedKph === "number" && Number.isFinite(input.speedKph);
  const speedKph = hasSpeed ? Number(input.speedKph) : null;
  const movement = input.movement;

  if (movement === true || (speedKph !== null && speedKph > 0)) {
    return "moving";
  }

  if (movement === false || speedKph !== null || input.ignitionOn !== null) {
    if (input.ignitionOn === true) {
      return "idling";
    }
    if (input.ignitionOn === false) {
      return "parked";
    }
    return "stationary";
  }

  return "stationary";
}
