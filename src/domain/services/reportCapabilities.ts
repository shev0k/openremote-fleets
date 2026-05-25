import type { ReportCapabilityId, ReportDefinition, ReportVehicleSelection } from "../models/reports";
import { hasValidVehicleLocation, type Vehicle, type VehicleStatus } from "../models/vehicle";

export interface VehicleReportCapabilityProfile {
  vehicleId: string;
  vehicleName: string;
  capabilityIds: ReportCapabilityId[];
  signalIds: string[];
}

export interface VehicleReportGroup {
  id: string;
  name: string;
  vehicleIds: string[];
  description?: string;
}

export interface ReportCompatibilityExcludedVehicle {
  vehicleId: string;
  vehicleName: string;
  missingCapabilities: ReportCapabilityId[];
}

export interface ReportCompatibilitySummary {
  isAvailable: boolean;
  compatibleVehicleIds: string[];
  excludedVehicles: ReportCompatibilityExcludedVehicle[];
  message: string;
}

const SIGNAL_CAPABILITY_MAP: Record<string, ReportCapabilityId[]> = {
  gpsLocation: ["location"],
  direction: ["location"],
  satellites: ["location", "gnssStatus"],
  speed: ["speed"],
  movement: ["movement"],
  ignition: ["ignition"],
  totalOdometer: ["odometer"],
  tripOdometer: ["odometer", "tripHistory"],
  fuelLevel: ["fuelLevel"],
  fuelUsedGps: ["fuelConsumed"],
  fuelRateGps: ["fuelConsumed"],
  batteryLevel: ["batteryVoltage"],
  batteryVoltage: ["batteryVoltage"],
  externalVoltage: ["externalVoltage"],
  engineRpm: ["rpm"],
  gnssStatus: ["gnssStatus"],
  gnssHdop: ["gnssHdop"],
  gsmSignal: ["gsmSignal"],
  iButton: ["driverIdentification"],
  alarm: ["alarms"],
};

export const REPORT_CAPABILITY_LABELS: Record<ReportCapabilityId, string> = {
  location: "location data",
  speed: "speed data",
  movement: "movement data",
  ignition: "ignition data",
  odometer: "odometer data",
  fuelLevel: "fuel level data",
  fuelConsumed: "fuel consumption data",
  batteryVoltage: "battery data",
  externalVoltage: "external voltage data",
  rpm: "RPM data",
  gnssStatus: "GNSS status data",
  gnssHdop: "GNSS HDOP data",
  gsmSignal: "GSM signal data",
  driverIdentification: "iButton or driver identification data",
  alarms: "alarm data",
  digitalInputs: "digital input data",
  analogInputs: "analog input data",
  canBus: "CANBus data",
  temperature: "temperature data",
  doorState: "door state data",
  geofenceEvents: "geofence or place event data",
  tripHistory: "trip history data",
};

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function getVehicleReportSignalIds(vehicle: Vehicle): string[] {
  const sampleIds = vehicle.latestTelemetrySamples?.map((sample) => sample.signalId) ?? [];
  const attributeIds = Object.keys(vehicle.teltonika?.attributes ?? {});

  return unique([...sampleIds, ...attributeIds]);
}

export function deriveVehicleReportCapabilities(
  vehicles: Vehicle[],
): Record<string, VehicleReportCapabilityProfile> {
  return Object.fromEntries(
    vehicles.map((vehicle) => {
      const signalIds = getVehicleReportSignalIds(vehicle);
      const capabilityIds = unique(
        signalIds.flatMap((signalId) => SIGNAL_CAPABILITY_MAP[signalId] ?? []),
      );

      if (hasValidVehicleLocation(vehicle)) {
        capabilityIds.push("location");
      }

      if (vehicle.activeAlertCount > 0) {
        capabilityIds.push("alarms");
      }

      return [
        vehicle.id,
        {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          capabilityIds: unique(capabilityIds),
          signalIds,
        },
      ];
    }),
  );
}

export function vehicleHasReportCapability(vehicle: Vehicle, capabilityId: ReportCapabilityId): boolean {
  const profile = deriveVehicleReportCapabilities([vehicle])[vehicle.id];
  return profile?.capabilityIds.includes(capabilityId) ?? false;
}

export function filterVehiclesByRequiredReportCapabilities(
  vehicles: Vehicle[],
  requiredCapabilities: ReportCapabilityId[] = [],
): Vehicle[] {
  if (!requiredCapabilities.length) return vehicles;

  return vehicles.filter((vehicle) =>
    requiredCapabilities.every((capabilityId) => vehicleHasReportCapability(vehicle, capabilityId)),
  );
}

export function createDefaultVehicleGroups(vehicles: Vehicle[]): VehicleReportGroup[] {
  const byStatus = (status: VehicleStatus) => vehicles.filter((vehicle) => vehicle.status === status).map((vehicle) => vehicle.id);
  const byClass = (assetClass: Vehicle["assetClass"]) => vehicles.filter((vehicle) => vehicle.assetClass === assetClass).map((vehicle) => vehicle.id);

  return [
    { id: "all", name: "All vehicles", vehicleIds: vehicles.map((vehicle) => vehicle.id) },
    { id: "status-moving", name: "Moving", vehicleIds: byStatus("moving") },
    { id: "status-idling", name: "Idling", vehicleIds: byStatus("idling") },
    { id: "status-parked", name: "Parked", vehicleIds: byStatus("parked") },
    { id: "status-stationary", name: "Stationary", vehicleIds: byStatus("stationary") },
    { id: "status-alerting", name: "Alerting", vehicleIds: byStatus("alerting") },
    { id: "status-offline", name: "Offline", vehicleIds: byStatus("offline") },
    { id: "class-truck", name: "Trucks", vehicleIds: byClass("truck") },
    { id: "class-van", name: "Vans", vehicleIds: byClass("van") },
    { id: "class-car", name: "Cars", vehicleIds: byClass("car") },
  ].filter((group) => group.vehicleIds.length > 0);
}

export function resolveReportVehicleSelection(
  selection: ReportVehicleSelection,
  vehicles: Vehicle[],
  groups: VehicleReportGroup[] = createDefaultVehicleGroups(vehicles),
): Vehicle[] {
  if (selection.mode === "all") {
    return vehicles;
  }

  if (selection.mode === "selected") {
    const selectedIds = new Set(selection.vehicleIds ?? []);
    return vehicles.filter((vehicle) => selectedIds.has(vehicle.id));
  }

  if (selection.mode === "status") {
    const selectedStatusIds = new Set(selection.statusIds ?? []);
    return vehicles.filter((vehicle) => selectedStatusIds.has(vehicle.status));
  }

  const selectedGroupIds = new Set(selection.groupIds ?? []);
  const selectedVehicleIds = new Set(
    groups
      .filter((group) => selectedGroupIds.has(group.id))
      .flatMap((group) => group.vehicleIds),
  );

  return vehicles.filter((vehicle) => selectedVehicleIds.has(vehicle.id));
}

export function summarizeReportCompatibility(
  definition: ReportDefinition,
  selectedVehicles: Vehicle[],
  capabilityProfiles: Record<string, VehicleReportCapabilityProfile>,
): ReportCompatibilitySummary {
  const requiredCapabilities = definition.requiredCapabilities ?? [];

  if (!selectedVehicles.length) {
    return {
      isAvailable: false,
      compatibleVehicleIds: [],
      excludedVehicles: [],
      message: "Select at least one vehicle.",
    };
  }

  if (!requiredCapabilities.length) {
    return {
      isAvailable: true,
      compatibleVehicleIds: selectedVehicles.map((vehicle) => vehicle.id),
      excludedVehicles: [],
      message: `${definition.name} is available for all ${selectedVehicles.length} selected vehicles.`,
    };
  }

  const excludedVehicles = selectedVehicles
    .map<ReportCompatibilityExcludedVehicle | null>((vehicle) => {
      const profile = capabilityProfiles[vehicle.id];
      const capabilities = new Set(profile?.capabilityIds ?? []);
      const missingCapabilities = requiredCapabilities.filter((capabilityId) => !capabilities.has(capabilityId));

      return missingCapabilities.length
        ? {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            missingCapabilities,
          }
        : null;
    })
    .filter((vehicle): vehicle is ReportCompatibilityExcludedVehicle => vehicle !== null);

  const excludedVehicleIds = new Set(excludedVehicles.map((vehicle) => vehicle.vehicleId));
  const compatibleVehicleIds = selectedVehicles
    .filter((vehicle) => !excludedVehicleIds.has(vehicle.id))
    .map((vehicle) => vehicle.id);

  if (!compatibleVehicleIds.length) {
    const capabilityList = requiredCapabilities.map((capability) => REPORT_CAPABILITY_LABELS[capability]).join(", ");
    return {
      isAvailable: false,
      compatibleVehicleIds,
      excludedVehicles,
      message: `${definition.name} is unavailable because none of the selected vehicles expose ${capabilityList}.`,
    };
  }

  if (excludedVehicles.length) {
    return {
      isAvailable: true,
      compatibleVehicleIds,
      excludedVehicles,
      message: `${definition.name} is available for ${compatibleVehicleIds.length} of ${selectedVehicles.length} selected vehicles. ${excludedVehicles.length} ${excludedVehicles.length === 1 ? "vehicle" : "vehicles"} will be excluded.`,
    };
  }

  return {
    isAvailable: true,
    compatibleVehicleIds,
    excludedVehicles,
    message: `${definition.name} is available for all ${selectedVehicles.length} selected vehicles.`,
  };
}
