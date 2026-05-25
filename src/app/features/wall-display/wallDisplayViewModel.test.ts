import { describe, expect, it } from "vitest";
import { Vehicle } from "../../../domain/models/vehicle";
import { buildWallDisplayViewModel } from "./wallDisplayViewModel";

function createVehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: "vehicle",
    name: "Vehicle",
    plate: "AA-000-A",
    status: "moving",
    speedKph: 0,
    ignitionOn: false,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 0,
    lastUpdatedIso: "2026-05-07T12:00:00.000Z",
    driverName: "Driver",
    trackerId: "tracker",
    assetName: "Asset",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    teltonika: {
      imei: "352094085231592",
      model: "FMC003",
      protocol: "tcp",
      codec: "codec8e",
      timestampIso: "2026-05-07T12:00:00.000Z",
      attributes: {},
    },
    ...overrides,
  };
}

function withAttributes(vehicle: Vehicle, attributes: Record<string, number | string | boolean>): Vehicle {
  return {
    ...vehicle,
    teltonika: vehicle.teltonika
      ? {
          ...vehicle.teltonika,
          attributes: Object.fromEntries(
            Object.entries(attributes).map(([attributeName, value]) => [
              attributeName,
              {
                avlId: attributeName,
                attributeName,
                displayName: attributeName,
                value,
                parameterGroup: "test",
                timestampIso: vehicle.lastUpdatedIso,
              },
            ]),
          ),
        }
      : undefined,
  };
}

describe("buildWallDisplayViewModel", () => {
  it("summarizes fleet state and Teltonika-backed telemetry for wall display cards", () => {
    const vehicles = [
      withAttributes(
        createVehicle({
          id: "atlas",
          name: "Atlas 12",
          status: "moving",
          speedKph: 32,
          ignitionOn: true,
          activeAlertCount: 0,
        }),
        {
          tripOdometer: 24000,
          totalOdometer: 180000000,
          fuelRateGps: 9.4,
          fuelLevel: 60,
          batteryLevel: 80,
          externalVoltage: 12.4,
          engineRpm: 1200,
          gsmSignal: 5,
          gnssHdop: 0.8,
          satellites: 12,
          iButton: "driver-atlas",
        },
      ),
      withAttributes(
        createVehicle({
          id: "harbor",
          name: "Harbor 07",
          status: "alerting",
          speedKph: 6,
          ignitionOn: true,
          activeAlertCount: 2,
          lastUpdatedIso: "2026-05-07T12:03:00.000Z",
        }),
        {
          tripOdometer: 11000,
          totalOdometer: 95000000,
          fuelRateGps: 11.2,
          fuelLevel: 40,
          batteryLevel: 70,
          externalVoltage: 11.2,
          engineRpm: 900,
          gsmSignal: 3,
          gnssHdop: 1.4,
          satellites: 8,
        },
      ),
      createVehicle({
        id: "nimbus",
        name: "Nimbus 03",
        status: "offline",
        speedKph: 0,
        ignitionOn: false,
        activeAlertCount: 0,
        lastUpdatedIso: "2026-05-07T10:40:00.000Z",
      }),
    ];

    const viewModel = buildWallDisplayViewModel(vehicles, new Date("2026-05-07T12:05:00.000Z"));

    expect(viewModel.fleet.totalVehicles).toBe(3);
    expect(viewModel.fleet.connectedVehicles).toBe(2);
    expect(viewModel.fleet.offlineVehicles).toBe(1);
    expect(viewModel.fleet.activeAlarmCount).toBe(2);
    expect(viewModel.metricCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "mileage", value: "35.0 km" }),
        expect.objectContaining({ id: "consumption", value: "10.3 L/100km" }),
        expect.objectContaining({ id: "occupancy", value: "67%" }),
        expect.objectContaining({ id: "alarms", value: "2" }),
        expect.objectContaining({ id: "freshness", value: "2/3" }),
        expect.objectContaining({ id: "drivers", value: "1" }),
      ]),
    );
    expect(viewModel.telemetryCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "avgSpeed", value: "13 km/h" }),
        expect.objectContaining({ id: "fuel", value: "50%" }),
        expect.objectContaining({ id: "battery", value: "75%" }),
        expect.objectContaining({ id: "externalVoltage", value: "11.8 V" }),
        expect.objectContaining({ id: "engineRpm", value: "1,050 rpm" }),
        expect.objectContaining({ id: "gnss", value: "1.1 HDOP" }),
        expect.objectContaining({ id: "satellites", value: "10" }),
        expect.objectContaining({ id: "odometer", value: "275,000 km" }),
      ]),
    );
  });

  it("orders timeline items by operational urgency before recency", () => {
    const vehicles = [
      createVehicle({ id: "online", name: "Online", status: "moving", lastUpdatedIso: "2026-05-07T12:04:00.000Z" }),
      createVehicle({ id: "offline", name: "Offline", status: "offline", lastUpdatedIso: "2026-05-07T12:02:00.000Z" }),
      createVehicle({ id: "alerting", name: "Alerting", status: "alerting", activeAlertCount: 1, lastUpdatedIso: "2026-05-07T12:01:00.000Z" }),
    ];

    const viewModel = buildWallDisplayViewModel(vehicles, new Date("2026-05-07T12:05:00.000Z"));

    expect(viewModel.timelineItems.map((item) => item.vehicleName)).toEqual(["Alerting", "Offline", "Online"]);
  });

  it("uses shared vehicle display status labels and color classes for timeline vehicle cards", () => {
    const vehicles = [
      createVehicle({ id: "parked", name: "Parked", status: "parked", lastUpdatedIso: "2026-05-07T12:04:00.000Z" }),
      createVehicle({ id: "moving-alert", name: "Moving Alert", status: "moving", activeAlertCount: 1, lastUpdatedIso: "2026-05-07T12:03:00.000Z" }),
    ];

    const viewModel = buildWallDisplayViewModel(vehicles, new Date("2026-05-07T12:05:00.000Z"));

    expect(viewModel.timelineItems.find((item) => item.id === "parked")).toMatchObject({
      statusId: "parked",
      statusLabel: "Parked",
      statusBadgeClassName: expect.stringContaining("vehicle-status-parked"),
      statusColorClassName: expect.stringContaining("vehicle-status-parked"),
    });
    expect(viewModel.timelineItems.find((item) => item.id === "moving-alert")).toMatchObject({
      statusId: "alerting",
      statusLabel: "Alerting",
      statusBadgeClassName: expect.stringContaining("vehicle-status-alerting"),
    });
  });

  it("uses the selected global time format for generated labels", () => {
    const viewModel = buildWallDisplayViewModel([], new Date("2026-05-07T14:05:00.000Z"), {
      timeFormat: "12h",
    });

    expect(viewModel.generatedAtLabel).toMatch(/PM/i);
  });
});
