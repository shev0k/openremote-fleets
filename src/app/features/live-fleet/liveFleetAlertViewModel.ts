import { FleetAlert } from "../../../domain/models/alerts";
import { Vehicle, VehicleStatus } from "../../../domain/models/vehicle";
import { deriveVehicleOperationalStatus } from "../../../domain/models/vehicleOperationalStatus";

interface LiveFleetAlertProjectionOptions {
  trustAlertRows?: boolean;
}

function hasTriggeredAlerts(vehicle: Vehicle | undefined): boolean {
  return Boolean(
    vehicle &&
    vehicle.status === "alerting" &&
    vehicle.activeAlertCount > 0 &&
    deriveVehicleOperationalStatus({
      activeAlertCount: vehicle.activeAlertCount,
      explicitStatus: vehicle.status,
      hasLocation: vehicle.hasLocation,
      ignitionOn: vehicle.ignitionOn,
      speedKph: vehicle.speedKph,
    }) === "alerting",
  );
}

function getVehicleStatusWithoutAlerts(vehicle: Vehicle): VehicleStatus {
  return deriveVehicleOperationalStatus({
    activeAlertCount: 0,
    explicitStatus: vehicle.status,
    hasLocation: vehicle.hasLocation,
    ignitionOn: vehicle.ignitionOn,
    speedKph: vehicle.speedKph,
  });
}

function getAlertTimeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function applyLiveFleetAlertStateToVehicles(
  vehicles: Vehicle[],
  alerts: FleetAlert[],
  options: LiveFleetAlertProjectionOptions = {},
): Vehicle[] {
  const knownAlertCountByVehicleId = new Map<string, number>();
  const unresolvedAlertCountByVehicleId = new Map<string, number>();

  alerts.forEach((alert) => {
    if (!alert.vehicleId) {
      return;
    }

    knownAlertCountByVehicleId.set(alert.vehicleId, (knownAlertCountByVehicleId.get(alert.vehicleId) ?? 0) + 1);

    if (alert.state !== "Resolved") {
      unresolvedAlertCountByVehicleId.set(alert.vehicleId, (unresolvedAlertCountByVehicleId.get(alert.vehicleId) ?? 0) + 1);
    }
  });

  return vehicles.map((vehicle) => {
    const activeAlertCount = unresolvedAlertCountByVehicleId.get(vehicle.id) ?? 0;

    if (options.trustAlertRows && activeAlertCount > 0) {
      return {
        ...vehicle,
        status: "alerting",
        activeAlertCount,
      };
    }

    if (!hasTriggeredAlerts(vehicle)) {
      return vehicle.activeAlertCount > 0 ? { ...vehicle, activeAlertCount: 0 } : vehicle;
    }

    const knownAlertCount = knownAlertCountByVehicleId.get(vehicle.id) ?? 0;
    if (knownAlertCount === 0) {
      return vehicle;
    }

    if (activeAlertCount > 0) {
      return {
        ...vehicle,
        status: deriveVehicleOperationalStatus({
          activeAlertCount,
          explicitStatus: vehicle.status,
          hasLocation: vehicle.hasLocation,
          ignitionOn: vehicle.ignitionOn,
          speedKph: vehicle.speedKph,
        }),
        activeAlertCount,
      };
    }

    return {
      ...vehicle,
      status: getVehicleStatusWithoutAlerts(vehicle),
      activeAlertCount: 0,
    };
  });
}

export function getTriggeredLiveFleetAlerts(
  alerts: FleetAlert[],
  vehicles: Vehicle[],
  options: LiveFleetAlertProjectionOptions = {},
): FleetAlert[] {
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return alerts.filter((alert) => {
    if (!alert.vehicleId || alert.state === "Resolved") {
      return false;
    }

    const vehicle = vehiclesById.get(alert.vehicleId);
    return options.trustAlertRows ? Boolean(vehicle) : hasTriggeredAlerts(vehicle);
  });
}

export function getTriggeredLiveFleetAlertsCount(
  alerts: FleetAlert[],
  vehicles: Vehicle[],
  options: LiveFleetAlertProjectionOptions = {},
): number {
  return getTriggeredLiveFleetAlerts(alerts, vehicles, options).filter((alert) => alert.state === "Active").length;
}

export function getCriticalLiveFleetAlerts(
  alerts: FleetAlert[],
  vehicles: Vehicle[],
  options: LiveFleetAlertProjectionOptions = {},
): FleetAlert[] {
  return getTriggeredLiveFleetAlerts(alerts, vehicles, options)
    .filter((alert) => alert.severity === "high" && alert.state !== "Resolved")
    .sort((left, right) => getAlertTimeValue(right.timeIso) - getAlertTimeValue(left.timeIso));
}
