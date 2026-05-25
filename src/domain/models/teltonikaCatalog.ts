import type { TelemetrySignalDefinition } from "./telemetry";

export const TELTONIKA_DEVICE_PREFIX = "Teltonika";
export const TELTONIKA_FMC003_DEVICE_TYPE = "Teltonika FMC003";
export const TELTONIKA_PROTOCOL = "teltonika:tcp:avl";
export const TELTONIKA_CODEC = "CODEC_8";

export type TeltonikaValueMap = {
  priority: number;
  gpsLocation: { latitude: number; longitude: number };
  altitude: number;
  direction: number;
  satellites: number;
  speed: number;
  eventTriggered: number;
  ignition: boolean;
  movement: boolean;
  trip: boolean;
  gsmSignal: number;
  externalVoltage: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryLevel: number;
  gnssStatus: number;
  gnssHdop: number;
  totalOdometer: number;
  tripOdometer: number;
  fuelUsedGps: number;
  fuelRateGps: number;
  fuelLevel: number;
  sleepMode: number;
  dataMode: number;
  engineRpm: number;
  iButton: string;
};

export type TeltonikaAttributeDefinition = {
  avlId: string;
  displayName: string;
  unit?: string;
  parameterGroup: string;
};

export const TELTONIKA_ATTRIBUTE_DEFINITIONS: Record<string, TeltonikaAttributeDefinition> = {
  priority: { avlId: "pr", displayName: "Priority", parameterGroup: "Frame" },
  gpsLocation: { avlId: "latlng", displayName: "Location", parameterGroup: "Frame" },
  altitude: { avlId: "alt", displayName: "Altitude", unit: "m", parameterGroup: "Frame" },
  direction: { avlId: "ang", displayName: "Direction", unit: "deg", parameterGroup: "Frame" },
  satellites: { avlId: "sat", displayName: "Satellites", parameterGroup: "Frame" },
  speed: { avlId: "24", displayName: "Speed", unit: "km/h", parameterGroup: "Permanent I/O elements" },
  eventTriggered: { avlId: "evt", displayName: "Event Triggered", parameterGroup: "Frame" },
  ignition: { avlId: "239", displayName: "Ignition", parameterGroup: "Permanent I/O elements" },
  movement: { avlId: "240", displayName: "Movement", parameterGroup: "Permanent I/O elements" },
  trip: { avlId: "250", displayName: "Trip", parameterGroup: "Eventual I/O elements" },
  gsmSignal: { avlId: "21", displayName: "GSM Signal", parameterGroup: "Permanent I/O elements" },
  externalVoltage: { avlId: "66", displayName: "External Voltage", unit: "V", parameterGroup: "Permanent I/O elements" },
  batteryVoltage: { avlId: "67", displayName: "Battery Voltage", unit: "V", parameterGroup: "Permanent I/O elements" },
  batteryCurrent: { avlId: "68", displayName: "Battery Current", unit: "A", parameterGroup: "Permanent I/O elements" },
  batteryLevel: { avlId: "113", displayName: "Battery Level", unit: "%", parameterGroup: "Permanent I/O elements" },
  gnssStatus: { avlId: "69", displayName: "GNSS Status", parameterGroup: "Permanent I/O elements" },
  gnssHdop: { avlId: "182", displayName: "GNSS HDOP", parameterGroup: "Permanent I/O elements" },
  totalOdometer: { avlId: "16", displayName: "Total Odometer", unit: "m", parameterGroup: "Permanent I/O elements" },
  tripOdometer: { avlId: "199", displayName: "Trip Odometer", unit: "m", parameterGroup: "Permanent I/O elements" },
  fuelUsedGps: { avlId: "12", displayName: "Fuel Used GPS", unit: "l", parameterGroup: "Permanent I/O elements" },
  fuelRateGps: { avlId: "13", displayName: "Fuel Rate GPS", unit: "l/100km", parameterGroup: "Permanent I/O elements" },
  fuelLevel: { avlId: "48", displayName: "Fuel Level", unit: "%", parameterGroup: "OBD elements" },
  sleepMode: { avlId: "200", displayName: "Sleep Mode", parameterGroup: "Permanent I/O elements" },
  dataMode: { avlId: "80", displayName: "Data Mode", parameterGroup: "Permanent I/O elements" },
  engineRpm: { avlId: "36", displayName: "Engine RPM", unit: "rpm", parameterGroup: "OBD elements" },
  iButton: { avlId: "78", displayName: "iButton", parameterGroup: "Permanent I/O elements" },
  imei: { avlId: "imei", displayName: "IMEI", parameterGroup: "Device" },
  protocol: { avlId: "protocol", displayName: "Protocol", parameterGroup: "Device" },
  codec: { avlId: "codec", displayName: "Codec", parameterGroup: "Device" },
  model: { avlId: "model", displayName: "Model", parameterGroup: "Device" },
};

export const TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS: TelemetrySignalDefinition[] = [
  { id: "speed", attributeName: "speed", displayName: "Speed", valueType: "numeric", source: "teltonika", teltonikaAvlId: "24", unit: "km/h" },
  { id: "ignition", attributeName: "ignition", displayName: "Ignition", valueType: "boolean", source: "teltonika", teltonikaAvlId: "239" },
  { id: "movement", attributeName: "movement", displayName: "Movement", valueType: "boolean", source: "teltonika", teltonikaAvlId: "240" },
  { id: "trip", attributeName: "trip", displayName: "Trip", valueType: "boolean", source: "teltonika", teltonikaAvlId: "250" },
  { id: "fuelLevel", attributeName: "fuelLevel", displayName: "Fuel Level", valueType: "numeric", source: "teltonika", teltonikaAvlId: "48", unit: "%" },
  { id: "fuelUsedGps", attributeName: "fuelUsedGps", displayName: "Fuel Used GPS", valueType: "numeric", source: "teltonika", teltonikaAvlId: "12", unit: "l" },
  { id: "fuelRateGps", attributeName: "fuelRateGps", displayName: "Fuel Rate GPS", valueType: "numeric", source: "teltonika", teltonikaAvlId: "13", unit: "l/100km" },
  { id: "batteryLevel", attributeName: "batteryLevel", displayName: "Battery Level", valueType: "numeric", source: "teltonika", teltonikaAvlId: "113", unit: "%" },
  { id: "batteryVoltage", attributeName: "batteryVoltage", displayName: "Battery Voltage", valueType: "numeric", source: "teltonika", teltonikaAvlId: "67", unit: "V" },
  { id: "batteryCurrent", attributeName: "batteryCurrent", displayName: "Battery Current", valueType: "numeric", source: "teltonika", teltonikaAvlId: "68", unit: "A" },
  { id: "externalVoltage", attributeName: "externalVoltage", displayName: "External Voltage", valueType: "numeric", source: "teltonika", teltonikaAvlId: "66", unit: "V" },
  { id: "engineRpm", attributeName: "engineRpm", displayName: "Engine RPM", valueType: "numeric", source: "teltonika", teltonikaAvlId: "36", unit: "rpm" },
  { id: "gnssStatus", attributeName: "gnssStatus", displayName: "GNSS Status", valueType: "numeric", source: "teltonika", teltonikaAvlId: "69" },
  { id: "gnssHdop", attributeName: "gnssHdop", displayName: "GNSS HDOP", valueType: "numeric", source: "teltonika", teltonikaAvlId: "182" },
  { id: "gsmSignal", attributeName: "gsmSignal", displayName: "GSM Signal", valueType: "numeric", source: "teltonika", teltonikaAvlId: "21" },
  { id: "totalOdometer", attributeName: "totalOdometer", displayName: "Total Odometer", valueType: "numeric", source: "teltonika", teltonikaAvlId: "16", unit: "m" },
  { id: "tripOdometer", attributeName: "tripOdometer", displayName: "Trip Odometer", valueType: "numeric", source: "teltonika", teltonikaAvlId: "199", unit: "m" },
  { id: "direction", attributeName: "direction", displayName: "Direction", valueType: "numeric", source: "teltonika", teltonikaAvlId: "ang", unit: "deg" },
  { id: "satellites", attributeName: "satellites", displayName: "Satellites", valueType: "numeric", source: "teltonika", teltonikaAvlId: "sat" },
  { id: "iButton", attributeName: "iButton", displayName: "iButton", valueType: "enum", source: "teltonika", teltonikaAvlId: "78", isOptional: true },
  { id: "alarm", attributeName: "alarm", displayName: "Alarm", valueType: "event", source: "openRemote", isOptional: true },
];

export const OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES = Array.from(new Set([
  "gpsLocation",
  "location",
  ...TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS
    .filter((definition) => definition.id !== "alarm")
    .map((definition) => definition.attributeName),
  "activeAlertCount",
]));
