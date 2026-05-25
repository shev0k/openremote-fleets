import { describe, expect, it } from "vitest";
import type { TripSegment } from "../../../domain/models/playback";
import { getSegmentGraphEvents } from "./segmentGraphEvents";

const segment: TripSegment = {
  id: "trip-1",
  startLabel: "08:00",
  endLabel: "08:20",
  startTimeIso: "2026-05-06T08:00:00.000Z",
  endTimeIso: "2026-05-06T08:20:00.000Z",
  durationLabel: "20 min",
  durationMinutes: 20,
  distanceLabel: "4.2 km",
  distanceKm: 4.2,
  stopCount: 1,
  maxSpeedLabel: "54 km/h",
  maxSpeedKph: 54,
  averageSpeedLabel: "28 km/h",
  averageSpeedKph: 28,
  startProgressPercent: 0,
  endProgressPercent: 100,
  markers: [
    { id: "stop-1", type: "stop", timestampIso: "2026-05-06T08:04:00.000Z", latitude: 51.44, longitude: 5.46, label: "Stop", durationMinutes: 4 },
    { id: "break-1", type: "break", timestampIso: "2026-05-06T08:10:00.000Z", latitude: 51.45, longitude: 5.47, label: "Driver break", durationMinutes: 12 },
    { id: "signal-1", type: "signal", timestampIso: "2026-05-06T08:14:00.000Z", latitude: 51.46, longitude: 5.48, label: "Signal degraded" },
  ],
  eventMarkers: [
    { id: "alarm-1", eventType: "alarm", timestampIso: "2026-05-06T08:06:00.000Z", label: "Fuel warning", severity: "warning", sourceAttribute: "fuelLevel" },
  ],
};

describe("segmentGraphEvents", () => {
  it("combines alarms and marker policy events in timestamp order", () => {
    expect(getSegmentGraphEvents(segment).map((event) => [event.id, event.label, event.severity])).toEqual([
      ["stop-1", "Stop · 4 min", "info"],
      ["alarm-1", "Fuel warning", "warning"],
      ["break-1", "Driver break · 12 min", "warning"],
      ["signal-1", "Signal degraded", "warning"],
    ]);
  });

  it("sorts invalid timestamps after valid timestamps deterministically", () => {
    const segmentWithInvalidTimestamps: TripSegment = {
      ...segment,
      markers: [
        { id: "invalid-z", type: "stop", timestampIso: "not-a-date", latitude: 51.44, longitude: 5.46, label: "Invalid stop" },
        { id: "valid-late", type: "idle", timestampIso: "2026-05-06T08:12:00.000Z", latitude: 51.45, longitude: 5.47, label: "Idle" },
      ],
      eventMarkers: [
        { id: "invalid-a", eventType: "alarm", timestampIso: "also-not-a-date", label: "Invalid alarm", severity: "warning" },
        { id: "valid-early", eventType: "alarm", timestampIso: "2026-05-06T08:02:00.000Z", label: "Early alarm", severity: "critical" },
      ],
    };

    expect(getSegmentGraphEvents(segmentWithInvalidTimestamps).map((event) => event.id)).toEqual([
      "valid-early",
      "valid-late",
      "invalid-a",
      "invalid-z",
    ]);
  });
});
