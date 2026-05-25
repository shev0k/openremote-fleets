import { TeltonikaTrackerSnapshot } from "./teltonika";
import { TelemetrySignalDefinition, TelemetrySignalSample } from "./telemetry";

export type AssetConnectivityStatus = "Connected" | "Disconnected" | "Degraded";

export interface AssetDevice {
  id: string;
  assetName: string;
  linkedVehicleId?: string;
  linkedVehicleName: string;
  linkedVehiclePlate: string;
  trackerId: string;
  deviceType: string;
  lastSyncIso: string;
  signalStrengthPercent: number;
  batteryPercent?: number;
  status: AssetConnectivityStatus;
  openRemoteId?: string;
  firmwareVersion?: string;
  metadata: Record<string, string>;
  availableTelemetrySignals?: TelemetrySignalDefinition[];
  latestTelemetrySamples?: TelemetrySignalSample[];
  teltonika?: TeltonikaTrackerSnapshot;
}
