import type { TeltonikaAttributeSample, TeltonikaAttributeValue, TeltonikaTrackerSnapshot } from "../../domain/models/teltonika";
import { TELTONIKA_FMC003_DEVICE_TYPE, TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "../../domain/models/teltonikaCatalog";
import type { TelemetrySignalSample } from "../../domain/models/telemetry";
import type { Vehicle } from "../../domain/models/vehicle";

type TelemetryValueMap = Record<string, TeltonikaAttributeValue>;

const TELEMETRY_METADATA: Record<string, { avlId: string; displayName: string; unit?: string; parameterGroup?: string }> = {
  speed: { avlId: "24", displayName: "Speed", unit: "km/h" },
  ignition: { avlId: "239", displayName: "Ignition" },
  movement: { avlId: "240", displayName: "Movement" },
  gsmSignal: { avlId: "21", displayName: "GSM Signal" },
  externalVoltage: { avlId: "66", displayName: "External Voltage", unit: "V" },
  batteryLevel: { avlId: "113", displayName: "Battery Level", unit: "%" },
  gnssStatus: { avlId: "69", displayName: "GNSS Status" },
  gnssHdop: { avlId: "182", displayName: "GNSS HDOP" },
  satellites: { avlId: "181", displayName: "Satellites" },
  totalOdometer: { avlId: "16", displayName: "Total Odometer", unit: "m" },
  tripOdometer: { avlId: "199", displayName: "Trip Odometer", unit: "m" },
  fuelLevel: { avlId: "89", displayName: "Fuel Level", unit: "%" },
  engineRpm: { avlId: "85", displayName: "Engine RPM", unit: "rpm" },
  iButton: { avlId: "78", displayName: "iButton" },
};

function createTeltonikaAttributes(values: TelemetryValueMap, timestampIso: string): Record<string, TeltonikaAttributeSample> {
  return Object.fromEntries(
    Object.entries(values).map(([attributeName, value]) => {
      const metadata = TELEMETRY_METADATA[attributeName] ?? { avlId: attributeName, displayName: attributeName };
      return [
        attributeName,
        {
          avlId: metadata.avlId,
          attributeName,
          displayName: metadata.displayName,
          value,
          unit: metadata.unit,
          parameterGroup: metadata.parameterGroup ?? "AVL",
          timestampIso,
        },
      ];
    }),
  );
}

function createTelemetrySamples(values: TelemetryValueMap, timestampIso: string): TelemetrySignalSample[] {
  return TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS.flatMap((signal) => {
    const value = values[signal.attributeName];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      return [];
    }

    return [{
      signalId: signal.id,
      timestampIso,
      value,
      sourceAttribute: signal.attributeName,
    }];
  });
}

function createTeltonikaSnapshot(imei: string, values: TelemetryValueMap, timestampIso: string): TeltonikaTrackerSnapshot {
  return {
    imei,
    model: "FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso,
    attributes: createTeltonikaAttributes(values, timestampIso),
  };
}

export function createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  const timestampIso = overrides.lastUpdatedIso ?? "2026-05-06T09:00:00.000Z";
  const trackerId = overrides.trackerId ?? "352093086403655";
  const values: TelemetryValueMap = {
    speed: overrides.speedKph ?? 42,
    ignition: overrides.ignitionOn ?? true,
    movement: (overrides.speedKph ?? 42) > 2,
    gsmSignal: 5,
    externalVoltage: 12.1,
    batteryLevel: overrides.batteryLevelPercent ?? 93,
    gnssStatus: 1,
    gnssHdop: 0.8,
    satellites: 16,
    totalOdometer: 182431000,
    tripOdometer: 84200,
    fuelLevel: overrides.fuelLevelPercent ?? 68,
    engineRpm: 1240,
    iButton: overrides.driverIdentifier ?? "0007104552",
  };

  return {
    id: "veh-test",
    name: "Test Vehicle",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 92,
    lastUpdatedIso: timestampIso,
    driverName: "Mila Janssen",
    trackerId,
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: TELTONIKA_FMC003_DEVICE_TYPE,
    activeAlertCount: 0,
    driverIdentifier: "0007104552",
    fuelLevelPercent: 68,
    batteryLevelPercent: 93,
    availableTelemetrySignals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    latestTelemetrySamples: createTelemetrySamples(values, timestampIso),
    teltonika: createTeltonikaSnapshot(trackerId, values, timestampIso),
    ...overrides,
  };
}

export function createFleetVehicles(): Vehicle[] {
  return [
    createVehicle({
      id: "veh-atlas-12",
      name: "Atlas 12",
      plate: "BR-482-K",
      status: "moving",
      speedKph: 28,
      trackerId: "352093086403655",
      driverName: "Mila Janssen",
      driverIdentifier: "0007104552",
      assetName: "Atlas Prime",
      assetClass: "truck",
      fuelLevelPercent: 68,
      batteryLevelPercent: 93,
    }),
    createVehicle({
      id: "veh-harbor-07",
      name: "Harbor 07",
      plate: "VT-903-P",
      status: "idling",
      speedKph: 68,
      trackerId: "352094085231592",
      driverName: "Sven Vermeer",
      driverIdentifier: "0007104553",
      assetName: "Harbor Relay",
      assetClass: "van",
      activeAlertCount: 1,
      fuelLevelPercent: 41,
      batteryLevelPercent: 76,
      latestTelemetrySamples: createTelemetrySamples({
        speed: 68,
        ignition: true,
        movement: true,
        gsmSignal: 3,
        externalVoltage: 12.036,
        batteryLevel: 76,
        gnssStatus: 1,
        gnssHdop: 1.5,
        satellites: 12,
        totalOdometer: 96482000,
        tripOdometer: 38400,
        fuelLevel: 41,
        engineRpm: 1960,
        iButton: "0007104553",
      }, "2026-05-06T09:00:00.000Z"),
      teltonika: createTeltonikaSnapshot("352094085231592", {
        speed: 68,
        ignition: true,
        movement: true,
        gsmSignal: 3,
        externalVoltage: 12.036,
        batteryLevel: 76,
        gnssStatus: 1,
        gnssHdop: 1.5,
        satellites: 12,
        totalOdometer: 96482000,
        tripOdometer: 38400,
        fuelLevel: 41,
        engineRpm: 1960,
        iButton: "0007104553",
      }, "2026-05-06T09:00:00.000Z"),
    }),
    createVehicle({
      id: "veh-delta-24",
      name: "Delta 24",
      plate: "NS-118-X",
      status: "alerting",
      speedKph: 41,
      trackerId: "352094085231600",
      driverName: "Noah de Wit",
      driverIdentifier: "0007104554",
      assetName: "Delta Runner",
      assetClass: "truck",
      activeAlertCount: 2,
      fuelLevelPercent: 23,
      batteryLevelPercent: 54,
      latestTelemetrySamples: createTelemetrySamples({
        speed: 41,
        ignition: true,
        movement: true,
        gsmSignal: 2,
        externalVoltage: 11.921,
        batteryLevel: 54,
        gnssStatus: 1,
        gnssHdop: 1.8,
        satellites: 9,
        totalOdometer: 208903000,
        tripOdometer: 51300,
        fuelLevel: 23,
        engineRpm: 1580,
        iButton: "0007104554",
      }, "2026-05-06T08:30:00.000Z"),
      teltonika: createTeltonikaSnapshot("352094085231600", {
        speed: 41,
        ignition: true,
        movement: true,
        gsmSignal: 2,
        externalVoltage: 11.921,
        batteryLevel: 54,
        gnssStatus: 1,
        gnssHdop: 1.8,
        satellites: 9,
        totalOdometer: 208903000,
        tripOdometer: 51300,
        fuelLevel: 23,
        engineRpm: 1580,
        iButton: "0007104554",
      }, "2026-05-06T08:30:00.000Z"),
    }),
    createVehicle({
      id: "veh-nimbus-03",
      name: "Nimbus 03",
      plate: "PX-557-D",
      status: "offline",
      speedKph: 46,
      trackerId: "352094085231618",
      driverName: "Lotte Bakker",
      driverIdentifier: "0007104555",
      assetName: "Nimbus Shadow",
      assetClass: "van",
      fuelLevelPercent: 79,
      batteryLevelPercent: 21,
      latestTelemetrySamples: createTelemetrySamples({
        speed: 46,
        ignition: true,
        movement: true,
        gsmSignal: 1,
        externalVoltage: 11.884,
        batteryLevel: 21,
        gnssStatus: 1,
        gnssHdop: 2.1,
        satellites: 9,
        totalOdometer: 136557000,
        tripOdometer: 0,
        fuelLevel: 79,
        engineRpm: 1710,
        iButton: "0007104555",
      }, "2026-05-06T06:28:00.000Z"),
      teltonika: createTeltonikaSnapshot("352094085231618", {
        speed: 46,
        ignition: true,
        movement: true,
        gsmSignal: 1,
        externalVoltage: 11.884,
        batteryLevel: 21,
        gnssStatus: 1,
        gnssHdop: 2.1,
        satellites: 9,
        totalOdometer: 136557000,
        tripOdometer: 0,
        fuelLevel: 79,
        engineRpm: 1710,
        iButton: "0007104555",
      }, "2026-05-06T06:28:00.000Z"),
    }),
    createVehicle({
      id: "veh-courier-19",
      name: "Courier 19",
      plate: "KF-220-M",
      status: "moving",
      speedKph: 28,
      trackerId: "352094085231626",
      driverName: "Iris Smeets",
      driverIdentifier: "0007104556",
      assetName: "Courier Wing",
      assetClass: "car",
      fuelLevelPercent: 57,
      batteryLevelPercent: 88,
      latestTelemetrySamples: createTelemetrySamples({
        speed: 28,
        ignition: true,
        movement: true,
        gsmSignal: 4,
        externalVoltage: 12.442,
        batteryLevel: 88,
        gnssStatus: 1,
        gnssHdop: 0.7,
        satellites: 18,
        totalOdometer: 61241000,
        tripOdometer: 92700,
        fuelLevel: 57,
        engineRpm: 1360,
        iButton: "0007104556",
      }, "2026-05-06T08:36:00.000Z"),
      teltonika: createTeltonikaSnapshot("352094085231626", {
        speed: 28,
        ignition: true,
        movement: true,
        gsmSignal: 4,
        externalVoltage: 12.442,
        batteryLevel: 88,
        gnssStatus: 1,
        gnssHdop: 0.7,
        satellites: 18,
        totalOdometer: 61241000,
        tripOdometer: 92700,
        fuelLevel: 57,
        engineRpm: 1360,
        iButton: "0007104556",
      }, "2026-05-06T08:36:00.000Z"),
    }),
  ];
}

export const TEST_FLEET_VEHICLES = createFleetVehicles();
