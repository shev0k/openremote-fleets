import { describe, expect, it } from "vitest";
import {
  deriveTripSegmentState,
  getTripSegmentSpeedBand,
  RouteSegmentTelemetryState,
} from "./playback";
import {
  TelemetrySignalDefinition,
  TelemetrySignalSample,
  isTelemetrySignalValueCompatible,
} from "./telemetry";
import { OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES, TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS } from "./teltonikaCatalog";
import { ReportDefinition, ReportOutputMode } from "./reports";
import type { RouteSegmentMarkerType } from "./playback";

describe("domain contracts", () => {
  it("derives route segment state with operational priority", () => {
    expect(deriveTripSegmentState({ activeAlarmCount: 1, ignitionOn: true, movement: true })).toBe("alarm");
    expect(deriveTripSegmentState({ ignitionOn: false, movement: false })).toBe("engineOff");
    expect(deriveTripSegmentState({ ignitionOn: true, movement: false, breakDurationMinutes: 45 })).toBe("break");
    expect(deriveTripSegmentState({ ignitionOn: true, movement: false, stopDurationMinutes: 12 })).toBe("stopped");
    expect(deriveTripSegmentState({ ignitionOn: true, movement: false, speedKph: 0 })).toBe("idle");
    expect(deriveTripSegmentState({ ignitionOn: true, movement: true, speedKph: 38 })).toBe("moving");
  });

  it("maps route segment speeds into stable speed bands", () => {
    const cases: Array<[number, RouteSegmentTelemetryState["speedBand"]]> = [
      [0, "stationary"],
      [8, "slow"],
      [45, "normal"],
      [88, "fast"],
      [112, "overspeed"],
    ];

    for (const [speedKph, speedBand] of cases) {
      expect(getTripSegmentSpeedBand(speedKph)).toBe(speedBand);
    }
  });

  it("exposes trip state and real-mode route marker types used by playback", () => {
    expect(TELTONIKA_TELEMETRY_SIGNAL_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "trip",
          attributeName: "trip",
          valueType: "boolean",
          source: "teltonika",
          teltonikaAvlId: "250",
        }),
      ]),
    );
    expect(OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES).toContain("trip");

    const markerTypes: RouteSegmentMarkerType[] = ["stop", "idle", "break", "engineOff", "offline", "signal", "alarm"];
    expect(markerTypes).toEqual(["stop", "idle", "break", "engineOff", "offline", "signal", "alarm"]);
  });

  it("models selectable telemetry signals by value type", () => {
    const definitions: TelemetrySignalDefinition[] = [
      { id: "ignition", attributeName: "ignition", displayName: "Ignition", valueType: "boolean", source: "teltonika", teltonikaAvlId: "239" },
      { id: "speed", attributeName: "speed", displayName: "Speed", valueType: "numeric", source: "teltonika", teltonikaAvlId: "24", unit: "km/h" },
      { id: "gnssStatus", attributeName: "gnssStatus", displayName: "GNSS Status", valueType: "enum", source: "teltonika", teltonikaAvlId: "69", enumValues: ["active", "lost"] },
      { id: "overspeed", attributeName: "overspeed", displayName: "Overspeed", valueType: "event", source: "openRemote" },
    ];

    const samples: TelemetrySignalSample[] = [
      { signalId: "ignition", timestampIso: "2026-03-29T10:00:00Z", value: true },
      { signalId: "speed", timestampIso: "2026-03-29T10:00:00Z", value: 48 },
      { signalId: "gnssStatus", timestampIso: "2026-03-29T10:00:00Z", value: "active" },
      { signalId: "overspeed", timestampIso: "2026-03-29T10:00:00Z", value: { eventType: "overspeed", severity: "warning" } },
    ];

    expect(samples.every((sample) => {
      const definition = definitions.find((item) => item.id === sample.signalId);
      return definition ? isTelemetrySignalValueCompatible(definition, sample.value) : false;
    })).toBe(true);
  });

  it("models report definitions independently from generated report data", () => {
    const definition: ReportDefinition = {
      id: "daily-summary",
      name: "Daily Summary",
      category: "operations",
      description: "Daily activity, alarms, mileage, and key telemetry.",
      supportedOutputModes: ["preview", "print", "export", "email", "schedule"],
      defaultOutputMode: "preview",
      parameterIds: ["speed", "ignition", "fuelLevel", "totalOdometer"],
      vehicleSelection: { mode: "selected", vehicleIds: ["veh-atlas-12"] },
      period: { type: "preset", preset: "today" },
      schedule: {
        enabled: true,
        frequency: "daily",
        recipientEmails: ["dispatch@example.com"],
      },
    };

    const allModes: ReportOutputMode[] = ["preview", "print", "export", "email", "schedule"];
    expect(definition.supportedOutputModes).toEqual(allModes);
    expect(definition.parameterIds).toContain("totalOdometer");
  });

});

