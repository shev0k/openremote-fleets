import { AssetDevice } from "../../../../domain/models/assets";
import {
  TELTONIKA_FMC003_DEVICE_TYPE,
  TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
} from "../../../../domain/models/teltonikaCatalog";
import { Vehicle } from "../../../../domain/models/vehicle";
import { MOCK_FLEET_FIXTURES } from "./fleetFixtures";
import {
  createTeltonikaSnapshot,
  createTelemetrySamplesFromValues,
  getTeltonikaNumber,
} from "./teltonikaTelemetryFixtures";

function createLinkedTeltonikaAsset(
  vehicle: Vehicle,
  input: {
    id: string;
    assetName: string;
    openRemoteId: string;
    status: AssetDevice["status"];
    firmwareVersion: string;
    metadata: Record<string, string>;
  },
): AssetDevice {
  const snapshot = vehicle.teltonika;

  if (!snapshot) {
    throw new Error(`Missing Teltonika snapshot for asset fixture: ${vehicle.id}`);
  }

  return {
    id: input.id,
    assetName: input.assetName,
    linkedVehicleId: vehicle.id,
    linkedVehicleName: vehicle.name,
    linkedVehiclePlate: vehicle.plate,
    trackerId: snapshot.imei,
    deviceType: TELTONIKA_FMC003_DEVICE_TYPE,
    lastSyncIso: snapshot.timestampIso,
    signalStrengthPercent: getTeltonikaNumber(snapshot, "gsmSignal") * 20,
    batteryPercent: getTeltonikaNumber(snapshot, "batteryLevel"),
    status: input.status,
    openRemoteId: input.openRemoteId,
    firmwareVersion: input.firmwareVersion,
    metadata: {
      imei: snapshot.imei,
      protocol: snapshot.protocol,
      codec: snapshot.codec,
      model: snapshot.model,
      externalVoltage: `${getTeltonikaNumber(snapshot, "externalVoltage").toFixed(3)}V`,
      fuelLevel: `${getTeltonikaNumber(snapshot, "fuelLevel")}%`,
      engineRpm: `${getTeltonikaNumber(snapshot, "engineRpm")}rpm`,
      gnssHdop: String(getTeltonikaNumber(snapshot, "gnssHdop")),
      totalOdometer: `${getTeltonikaNumber(snapshot, "totalOdometer")}m`,
      ...input.metadata,
    },
    availableTelemetrySignals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    latestTelemetrySamples: vehicle.latestTelemetrySamples,
    teltonika: snapshot,
  };
}

function requireVehicle(vehicleId: string): Vehicle {
  const vehicle = MOCK_FLEET_FIXTURES.find((entry) => entry.id === vehicleId);

  if (!vehicle) {
    throw new Error(`Missing vehicle fixture for asset: ${vehicleId}`);
  }

  return vehicle;
}

export const MOCK_ASSET_FIXTURES: AssetDevice[] = [
  createLinkedTeltonikaAsset(requireVehicle("veh-atlas-12"), {
    id: "asset-atlas-prime",
    assetName: "Atlas Prime",
    openRemoteId: "or-asset-2001",
    status: "Connected",
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      sim: "NL-KPN-01",
      zone: "EHV-North",
      profile: "linehaul",
    },
  }),
  createLinkedTeltonikaAsset(requireVehicle("veh-harbor-07"), {
    id: "asset-harbor-relay",
    assetName: "Harbor Relay",
    openRemoteId: "or-asset-2002",
    status: "Degraded",
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      sim: "NL-VDF-22",
      zone: "EHV-East",
      antenna: "internal",
    },
  }),
  createLinkedTeltonikaAsset(requireVehicle("veh-delta-24"), {
    id: "asset-delta-runner",
    assetName: "Delta Runner",
    openRemoteId: "or-asset-2003",
    status: "Connected",
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      sim: "NL-KPN-18",
      zone: "EHV-South",
      mount: "obd-port",
    },
  }),
  createLinkedTeltonikaAsset(requireVehicle("veh-nimbus-03"), {
    id: "asset-nimbus-shadow",
    assetName: "Nimbus Shadow",
    openRemoteId: "or-asset-2004",
    status: "Disconnected",
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      sim: "NL-ODIDO-04",
      zone: "Depot-B",
      issue: "external-power-loss",
    },
  }),
  {
    id: "asset-spare-kit-01",
    assetName: "Spare Kit 01",
    linkedVehicleName: "",
    linkedVehiclePlate: "",
    trackerId: "352094085231634",
    deviceType: TELTONIKA_FMC003_DEVICE_TYPE,
    lastSyncIso: "2026-03-28T16:25:00Z",
    signalStrengthPercent: 0,
    batteryPercent: 100,
    status: "Disconnected",
    openRemoteId: "or-asset-2005",
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      imei: "352094085231634",
      protocol: "teltonika:tcp:avl",
      codec: "CODEC_8",
      model: "FMC003",
      stock: "warehouse",
      ready: "true",
    },
    teltonika: createTeltonikaSnapshot({
      imei: "352094085231634",
      timestampIso: "2026-03-28T16:25:00Z",
      values: {
        priority: 0,
        gpsLocation: { latitude: 51.4498, longitude: 5.4711 },
        altitude: 19,
        direction: 0,
        satellites: 0,
        speed: 0,
        eventTriggered: 0,
        ignition: false,
        movement: false,
        trip: false,
        gsmSignal: 0,
        externalVoltage: 0,
        batteryVoltage: 4.012,
        batteryCurrent: 0,
        batteryLevel: 100,
        gnssStatus: 0,
        gnssHdop: 0,
        totalOdometer: 0,
        tripOdometer: 0,
        fuelUsedGps: 0,
        fuelRateGps: 0,
        fuelLevel: 0,
        sleepMode: 2,
        dataMode: 0,
        engineRpm: 0,
        iButton: "",
      },
    }),
    availableTelemetrySignals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    latestTelemetrySamples: createTelemetrySamplesFromValues({
      priority: 0,
      gpsLocation: { latitude: 51.4498, longitude: 5.4711 },
      altitude: 19,
      direction: 0,
      satellites: 0,
      speed: 0,
      eventTriggered: 0,
      ignition: false,
      movement: false,
      trip: false,
      gsmSignal: 0,
      externalVoltage: 0,
      batteryVoltage: 4.012,
      batteryCurrent: 0,
      batteryLevel: 100,
      gnssStatus: 0,
      gnssHdop: 0,
      totalOdometer: 0,
      tripOdometer: 0,
      fuelUsedGps: 0,
      fuelRateGps: 0,
      fuelLevel: 0,
      sleepMode: 2,
      dataMode: 0,
      engineRpm: 0,
      iButton: "",
    }, "2026-03-28T16:25:00Z"),
  },
];
