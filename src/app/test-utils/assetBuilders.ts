import type { AssetDevice } from "../../domain/models/assets";
import { TELTONIKA_FMC003_DEVICE_TYPE, TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "../../domain/models/teltonikaCatalog";
import { TEST_FLEET_VEHICLES } from "./vehicleBuilders";

export function createAssetDevices(): AssetDevice[] {
  return TEST_FLEET_VEHICLES.slice(0, 4).map((vehicle, index) => ({
    id: `asset-${vehicle.id}`,
    assetName: vehicle.assetName,
    linkedVehicleId: vehicle.id,
    linkedVehicleName: vehicle.name,
    linkedVehiclePlate: vehicle.plate,
    trackerId: vehicle.trackerId,
    deviceType: TELTONIKA_FMC003_DEVICE_TYPE,
    lastSyncIso: vehicle.lastUpdatedIso,
    signalStrengthPercent: [100, 60, 40, 20][index] ?? 0,
    batteryPercent: vehicle.batteryLevelPercent,
    status: vehicle.status === "offline" ? "Disconnected" : vehicle.activeAlertCount ? "Degraded" : "Connected",
    openRemoteId: `or-asset-${2001 + index}`,
    firmwareVersion: "FMB.Ver.03.29.00",
    metadata: {
      imei: vehicle.trackerId,
      protocol: vehicle.teltonika?.protocol ?? "teltonika:tcp:avl",
      codec: vehicle.teltonika?.codec ?? "CODEC_8",
      model: vehicle.teltonika?.model ?? "FMC003",
      externalVoltage: `${vehicle.teltonika?.attributes.externalVoltage?.value ?? "0"}V`,
      fuelLevel: `${vehicle.fuelLevelPercent ?? 0}%`,
      engineRpm: `${vehicle.teltonika?.attributes.engineRpm?.value ?? 0}rpm`,
      gnssHdop: String(vehicle.teltonika?.attributes.gnssHdop?.value ?? "0"),
      totalOdometer: `${vehicle.teltonika?.attributes.totalOdometer?.value ?? 0}m`,
    },
    availableTelemetrySignals: TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS,
    latestTelemetrySamples: vehicle.latestTelemetrySamples,
    teltonika: vehicle.teltonika,
  }));
}

export const TEST_ASSET_DEVICES = createAssetDevices();
