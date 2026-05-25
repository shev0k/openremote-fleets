/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import { LiveTelemetryCard } from "./LiveTelemetryCard";

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 52,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-03-29T09:12:00.000Z",
  driverName: "Mila Janssen",
  driverIdentifier: "0007104552",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 1,
  fuelLevelPercent: 68,
  batteryLevelPercent: 93,
  latestTelemetrySamples: [
    { signalId: "speed", timestampIso: "2026-03-29T09:12:00.000Z", value: 52, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso: "2026-03-29T09:12:00.000Z", value: true, sourceAttribute: "ignition" },
    { signalId: "movement", timestampIso: "2026-03-29T09:12:00.000Z", value: true, sourceAttribute: "movement" },
    { signalId: "fuelLevel", timestampIso: "2026-03-29T09:12:00.000Z", value: 68, sourceAttribute: "fuelLevel" },
    { signalId: "batteryLevel", timestampIso: "2026-03-29T09:12:00.000Z", value: 93, sourceAttribute: "batteryLevel" },
    { signalId: "externalVoltage", timestampIso: "2026-03-29T09:12:00.000Z", value: 12.18, sourceAttribute: "externalVoltage" },
    { signalId: "engineRpm", timestampIso: "2026-03-29T09:12:00.000Z", value: 1240, sourceAttribute: "engineRpm" },
    { signalId: "gnssHdop", timestampIso: "2026-03-29T09:12:00.000Z", value: 0.8, sourceAttribute: "gnssHdop" },
    { signalId: "gsmSignal", timestampIso: "2026-03-29T09:12:00.000Z", value: 5, sourceAttribute: "gsmSignal" },
  ],
};

const detail: VehicleDetail = {
  ...vehicle,
  lastCommunicationIso: "2026-03-29T09:12:00.000Z",
  gpsAccuracyMeters: 8,
  todayMileageKm: 84.2,
  odometerKm: 182431,
  fuelInTankLiters: 246,
  averageFuelConsumptionLitersPer100Km: 28.4,
  stoppedDurationMinutes: 18,
};

describe("LiveTelemetryCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders operational telemetry in a dense card", () => {
    render(<LiveTelemetryCard vehicle={vehicle} detail={detail} />);

    expect(screen.getByText("Live telemetry")).toBeInTheDocument();
    expect(screen.getByText("52 km/h")).toBeInTheDocument();
    expect(screen.getByText("Moving")).toBeInTheDocument();
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByText("1,240 rpm")).toBeInTheDocument();
    expect(screen.getByText("0.8 HDOP")).toBeInTheDocument();
    expect(screen.getByText("IMEI 352093086403655")).toBeInTheDocument();
  });

  it("uses a compact secondary metric grid so the top telemetry section fits the overlay", () => {
    render(<LiveTelemetryCard vehicle={vehicle} detail={detail} />);

    expect(screen.getByTestId("live-telemetry-secondary-grid")).toHaveClass("grid-cols-4");
  });
});
