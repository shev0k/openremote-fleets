import { describe, expect, it } from "vitest";
import { Vehicle } from "../../../domain/models/vehicle";
import { getLiveMapVehicles } from "./liveMapVehicles";

function createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    latitude: 51.4416,
    longitude: 5.4697,
    speedKph: 52,
    heading: 92,
    fuelLevelPercent: 68,
    batteryLevelPercent: 93,
    driverName: "Mila Janssen",
    assetName: "Atlas Prime",
    assetClass: "truck",
    activeAlertCount: 0,
    lastUpdatedIso: "2026-03-29T09:12:00Z",
    deviceType: "Teltonika FMC003",
    trackerId: "352093086403655",
    ignitionOn: true,
    ...overrides,
  };
}

describe("getLiveMapVehicles", () => {
  it("keeps the selected vehicle marker at its live position when route context is visible", () => {
    const selectedVehicle = createVehicle();
    const vehicles = [
      selectedVehicle,
      createVehicle({
        id: "veh-delta-24",
        name: "Delta 24",
        latitude: 51.4361,
        longitude: 5.4586,
      }),
    ];

    const mapVehicles = getLiveMapVehicles({
      vehicles,
      selectedVehicle,
      selectedVehicleId: selectedVehicle.id,
      routeLine: [
        [51.44, 5.45],
        [51.45, 5.49],
      ],
      playbackPosition: [51.99, 5.99],
      playbackSpeed: 2,
    });

    expect(mapVehicles.find((vehicle) => vehicle.id === selectedVehicle.id)).toMatchObject({
      latitude: selectedVehicle.latitude,
      longitude: selectedVehicle.longitude,
      speedKph: selectedVehicle.speedKph,
    });
  });

  it("moves the selected vehicle marker to the scrubbed historical route position", () => {
    const selectedVehicle = createVehicle();
    const historicalPosition: [number, number] = [51.4472, 5.4841];

    const mapVehicles = getLiveMapVehicles({
      vehicles: [selectedVehicle],
      selectedVehicle,
      selectedVehicleId: selectedVehicle.id,
      routeLine: [
        [51.44, 5.45],
        historicalPosition,
        [51.45, 5.49],
      ],
      playbackPosition: historicalPosition,
      playbackHeading: 184,
      playbackProgress: 35,
      playbackSpeed: 1,
      isTimelineInspecting: true,
    });

    expect(mapVehicles.find((vehicle) => vehicle.id === selectedVehicle.id)).toMatchObject({
      latitude: historicalPosition[0],
      longitude: historicalPosition[1],
      heading: 184,
    });
  });

  it("does not move the selected marker to playback coordinates unless the timeline is being inspected", () => {
    const selectedVehicle = createVehicle();
    const historicalPosition: [number, number] = [51.4472, 5.4841];

    const mapVehicles = getLiveMapVehicles({
      vehicles: [selectedVehicle],
      selectedVehicle,
      selectedVehicleId: selectedVehicle.id,
      routeLine: [
        [51.44, 5.45],
        historicalPosition,
        [51.45, 5.49],
      ],
      playbackPosition: historicalPosition,
      playbackHeading: 184,
      playbackProgress: 0,
      playbackSpeed: 1,
      isTimelineInspecting: false,
    });

    expect(mapVehicles.find((vehicle) => vehicle.id === selectedVehicle.id)).toMatchObject({
      latitude: selectedVehicle.latitude,
      longitude: selectedVehicle.longitude,
      heading: selectedVehicle.heading,
    });
  });
});
