import { TelemetrySignalSample, TelemetryTimeline } from "../../../../domain/models/telemetry";
import { TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "../../../../domain/models/teltonikaCatalog";
import { Vehicle } from "../../../../domain/models/vehicle";
import { MOCK_FLEET_FIXTURES } from "./fleetFixtures";
import { createTelemetrySamplesFromValues } from "./teltonikaTelemetryFixtures";

const TIMELINE_OFFSETS_MINUTES = [-90, -60, -30, 0];

function addMinutes(timestampIso: string, minutes: number): string {
  return new Date(new Date(timestampIso).getTime() + minutes * 60_000).toISOString();
}

function getBaseValues(vehicle: Vehicle) {
  const attributes = vehicle.teltonika?.attributes;

  if (!attributes) {
    throw new Error(`Missing Teltonika attributes for telemetry timeline: ${vehicle.id}`);
  }

  return {
    priority: Number(attributes.priority.value),
    gpsLocation: attributes.gpsLocation.value as { latitude: number; longitude: number },
    altitude: Number(attributes.altitude.value),
    direction: Number(attributes.direction.value),
    satellites: Number(attributes.satellites.value),
    speed: Number(attributes.speed.value),
    eventTriggered: Number(attributes.eventTriggered.value),
    ignition: attributes.ignition.value === true,
    movement: attributes.movement.value === true,
    trip: attributes.trip.value === true,
    gsmSignal: Number(attributes.gsmSignal.value),
    externalVoltage: Number(attributes.externalVoltage.value),
    batteryVoltage: Number(attributes.batteryVoltage.value),
    batteryCurrent: Number(attributes.batteryCurrent.value),
    batteryLevel: Number(attributes.batteryLevel.value),
    gnssStatus: Number(attributes.gnssStatus.value),
    gnssHdop: Number(attributes.gnssHdop.value),
    totalOdometer: Number(attributes.totalOdometer.value),
    tripOdometer: Number(attributes.tripOdometer.value),
    fuelUsedGps: Number(attributes.fuelUsedGps.value),
    fuelRateGps: Number(attributes.fuelRateGps.value),
    fuelLevel: Number(attributes.fuelLevel.value),
    sleepMode: Number(attributes.sleepMode.value),
    dataMode: Number(attributes.dataMode.value),
    engineRpm: Number(attributes.engineRpm.value),
    iButton: String(attributes.iButton.value),
  };
}

export function createVehicleTimeline(vehicle: Vehicle): TelemetryTimeline {
  const baseValues = getBaseValues(vehicle);
  const samples = TIMELINE_OFFSETS_MINUTES.flatMap<TelemetrySignalSample>((offsetMinutes, index) => {
    const timestampIso = addMinutes(vehicle.lastUpdatedIso, offsetMinutes);
    const parked = vehicle.status === "offline" || vehicle.status === "parked" || (vehicle.status === "idling" && index < 2);
    const speed = parked ? 0 : Math.max(0, baseValues.speed + (index - 2) * 7);

    return createTelemetrySamplesFromValues(
      {
        ...baseValues,
        speed,
        ignition: vehicle.status !== "offline",
        movement: speed > 0,
        trip: vehicle.status !== "offline" && (speed > 0 || vehicle.status === "idling"),
        fuelLevel: Math.max(0, baseValues.fuelLevel - (TIMELINE_OFFSETS_MINUTES.length - index - 1)),
        batteryLevel: Math.max(0, baseValues.batteryLevel - (vehicle.status === "offline" ? 3 : 1)),
        externalVoltage: vehicle.status === "offline" ? 0 : baseValues.externalVoltage,
        engineRpm: speed > 0 ? Math.max(850, baseValues.engineRpm + index * 110) : 0,
        gnssHdop: vehicle.status === "offline" ? 12 : Math.max(0.6, baseValues.gnssHdop + (index % 2) * 0.2),
        gsmSignal: Math.max(0, Math.min(5, baseValues.gsmSignal - (vehicle.status === "offline" ? 1 : 0))),
        totalOdometer: baseValues.totalOdometer + index * 1250,
        tripOdometer: baseValues.tripOdometer + index * 1250,
      },
      timestampIso,
      index === TIMELINE_OFFSETS_MINUTES.length - 1 ? vehicle.activeAlertCount : 0,
    );
  });

  return {
    vehicleId: vehicle.id,
    rangeStartIso: samples[0]?.timestampIso ?? vehicle.lastUpdatedIso,
    rangeEndIso: samples.at(-1)?.timestampIso ?? vehicle.lastUpdatedIso,
    signals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    samples,
  };
}

export const MOCK_TELEMETRY_TIMELINES: Record<string, TelemetryTimeline> = Object.fromEntries(
  MOCK_FLEET_FIXTURES.map((vehicle) => [vehicle.id, createVehicleTimeline(vehicle)]),
);

export function createMockTelemetryTimelines(vehicles: Vehicle[]): Record<string, TelemetryTimeline> {
  return Object.fromEntries(
    vehicles
      .filter((vehicle) => vehicle.teltonika?.attributes)
      .map((vehicle) => [vehicle.id, createVehicleTimeline(vehicle)]),
  );
}
