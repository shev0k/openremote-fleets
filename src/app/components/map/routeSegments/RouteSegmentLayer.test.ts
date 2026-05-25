/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import L from "leaflet";
import { createElement } from "react";
import { afterEach, vi } from "vitest";
import { PlaybackRoute, TripSegment } from "../../../../domain/models/playback";
import {
  RouteSegmentLayer,
  SEGMENT_REDRAW_EVENTS,
  getRouteSegmentMarkerModel,
  getSegmentTooltip,
} from "./RouteSegmentLayer";

function createSegment(overrides: Partial<TripSegment> = {}): TripSegment {
  return {
    id: "segment-test",
    startLabel: "Depot",
    endLabel: "Customer",
    startTimeIso: "2026-03-29T08:00:00Z",
    endTimeIso: "2026-03-29T08:30:00Z",
    durationLabel: "30 min",
    durationMinutes: 30,
    distanceLabel: "18 km",
    distanceKm: 18,
    stopCount: 1,
    maxSpeedLabel: "80 km/h",
    maxSpeedKph: 80,
    averageSpeedLabel: "52 km/h",
    averageSpeedKph: 52,
    startProgressPercent: 0,
    endProgressPercent: 20,
    ...overrides,
  };
}

function createRoute(segmentId: string): PlaybackRoute {
  return {
    vehicleId: "veh-test",
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
      { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:30:00Z" },
    ],
    tripSegments: [createSegment({ id: segmentId, startProgressPercent: 0, endProgressPercent: 100 })],
  };
}

describe("route segment layer", () => {
  afterEach(() => {
    cleanup();
  });

  it("lets Leaflet own animated path transforms during live move and zoom frames", () => {
    const redrawEvents = SEGMENT_REDRAW_EVENTS.split(" ");

    expect(redrawEvents).not.toContain("move");
    expect(redrawEvents).not.toContain("zoom");
    expect(redrawEvents).not.toContain("zoomanim");
    expect(redrawEvents).toContain("moveend");
    expect(redrawEvents).toContain("zoomend");
  });

  it("does not redraw segment polylines before Leaflet focus animations finish", () => {
    const mapContainer = document.createElement("div");
    mapContainer.style.width = "640px";
    mapContainer.style.height = "420px";
    document.body.appendChild(mapContainer);
    const map = L.map(mapContainer).setView([51.44, 5.46], 13);
    const redrawSpy = vi.spyOn(L.Polyline.prototype, "redraw");

    try {
      render(
        createElement(RouteSegmentLayer, {
          map,
          route: createRoute("segment-during-animation"),
          activeSegmentId: null,
          themeMode: "dark",
        }),
      );

      redrawSpy.mockClear();
      map.fire("move");
      expect(redrawSpy).not.toHaveBeenCalled();

      redrawSpy.mockClear();
      map.fire("zoom");
      expect(redrawSpy).not.toHaveBeenCalled();

      redrawSpy.mockClear();
      map.fire("zoomanim");
      expect(redrawSpy).not.toHaveBeenCalled();

      map.fire("moveend");
      expect(redrawSpy).toHaveBeenCalled();
    } finally {
      redrawSpy.mockRestore();
      map.remove();
      mapContainer.remove();
    }
  });

  it("keeps segment tooltips operational instead of labeling the whole segment as an event state", () => {
    const tooltip = getSegmentTooltip(createSegment({ state: "alarm", speedBand: "normal" }), "dark", 2);

    expect(tooltip).toContain("Trip 3");
    expect(tooltip).not.toContain("Trip segment");
    expect(tooltip).not.toContain("ALARM");
    expect(tooltip).not.toContain("ENGINE OFF");
    expect(tooltip).not.toContain("STOPPED");
  });

  it("excludes direction samples from the route marker model so arrows are not rendered", () => {
    const segment = createSegment({
      directionSamples: [
        {
          timestampIso: "2026-03-29T08:10:00Z",
          latitude: 51.44,
          longitude: 5.46,
          directionDegrees: 92,
        },
      ],
      markers: [
        {
          id: "stop-1",
          type: "stop",
          timestampIso: "2026-03-29T08:12:00Z",
          latitude: 51.441,
          longitude: 5.461,
        },
      ],
    });

    const markerModel = getRouteSegmentMarkerModel({
      vehicleId: "veh-test",
      points: [
        { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
        { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:30:00Z" },
      ],
      tripSegments: [segment],
    });

    expect(markerModel.stopMarkers).toHaveLength(1);
    expect(markerModel).not.toHaveProperty("directionSamples");
  });

  it("projects critical route event markers onto the nearest trip path point", () => {
    const markerModel = getRouteSegmentMarkerModel({
      vehicleId: "veh-test",
      points: [
        { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
        { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:15:00Z" },
        { latitude: 51.46, longitude: 5.48, timestampIso: "2026-03-29T08:30:00Z" },
      ],
      tripSegments: [
        createSegment({
          startProgressPercent: 0,
          endProgressPercent: 100,
          eventMarkers: [
            {
              id: "critical-alert-1",
              eventType: "alarm",
              timestampIso: "2026-03-29T08:16:00Z",
              label: "Overspeed",
              severity: "critical",
              sourceAttribute: "speed",
            },
          ],
        }),
      ],
    });

    expect(markerModel.stopMarkers).toContainEqual(
      expect.objectContaining({
        id: "critical-alert-1",
        type: "alarm",
        label: "Overspeed",
        latitude: 51.45,
        longitude: 5.47,
      }),
    );
  });

  it("selects a trip segment when its map path is clicked", () => {
    const mapContainer = document.createElement("div");
    mapContainer.style.width = "640px";
    mapContainer.style.height = "420px";
    document.body.appendChild(mapContainer);
    const map = L.map(mapContainer).setView([51.44, 5.46], 13);
    const onSegmentClick = vi.fn();

    try {
      render(
        createElement(RouteSegmentLayer, {
          map,
          route: {
            vehicleId: "veh-test",
            points: [
              { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
              { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:30:00Z" },
            ],
            tripSegments: [createSegment({ startProgressPercent: 0, endProgressPercent: 100 })],
          },
          activeSegmentId: null,
          themeMode: "dark",
          onSegmentClick,
        }),
      );

      const hitArea = mapContainer.querySelector(".route-segment-hit-area");
      expect(hitArea).toBeTruthy();

      fireEvent.click(hitArea as Element);

      expect(onSegmentClick).toHaveBeenCalledWith("segment-test");
    } finally {
      map.remove();
      mapContainer.remove();
    }
  });

  it("draws a neutral black or white casing under route segment dots for contrast", () => {
    const mapContainer = document.createElement("div");
    mapContainer.style.width = "640px";
    mapContainer.style.height = "420px";
    document.body.appendChild(mapContainer);
    const map = L.map(mapContainer).setView([51.44, 5.46], 13);

    try {
      const rendered = render(
        createElement(RouteSegmentLayer, {
          map,
          route: createRoute("segment-contrast"),
          activeSegmentId: null,
          themeMode: "dark",
        }),
      );

      const darkCasing = mapContainer.querySelector(".route-segment-casing");
      const darkLine = mapContainer.querySelector(".route-segment-line");

      expect(darkCasing).toBeTruthy();
      expect(darkLine).toBeTruthy();
      expect(Number(darkCasing?.getAttribute("stroke-width"))).toBeGreaterThan(
        Number(darkLine?.getAttribute("stroke-width")),
      );
      expect(darkCasing?.getAttribute("stroke")).toBe("#000000");

      rendered.rerender(
        createElement(RouteSegmentLayer, {
          map,
          route: createRoute("segment-contrast"),
          activeSegmentId: null,
          themeMode: "light",
        }),
      );

      const lightCasing = mapContainer.querySelector(".route-segment-casing");
      expect(lightCasing?.getAttribute("stroke")).toBe("#ffffff");
    } finally {
      map.remove();
      mapContainer.remove();
    }
  });

  it("updates the visible path layer while Leaflet is zooming", () => {
    const mapContainer = document.createElement("div");
    mapContainer.style.width = "640px";
    mapContainer.style.height = "420px";
    document.body.appendChild(mapContainer);
    const map = L.map(mapContainer).setView([51.44, 5.46], 13);
    const onSegmentClick = vi.fn();

    try {
      const rendered = render(
        createElement(RouteSegmentLayer, {
          map,
          route: createRoute("segment-before-zoom"),
          activeSegmentId: null,
          themeMode: "dark",
          onSegmentClick,
        }),
      );

      map.fire("zoomstart");
      rendered.rerender(
        createElement(RouteSegmentLayer, {
          map,
          route: createRoute("segment-after-zoom"),
          activeSegmentId: null,
          themeMode: "dark",
          onSegmentClick,
        }),
      );

      fireEvent.click(mapContainer.querySelector(".route-segment-hit-area") as Element);
      expect(onSegmentClick).toHaveBeenLastCalledWith("segment-after-zoom");
      expect(mapContainer.querySelectorAll(".route-segment-line")).toHaveLength(1);
    } finally {
      map.remove();
      mapContainer.remove();
    }
  });

  it("recreates segment SVG paths instead of mutating them during Leaflet zoom animation", () => {
    const mapContainer = document.createElement("div");
    mapContainer.style.width = "640px";
    mapContainer.style.height = "420px";
    document.body.appendChild(mapContainer);
    const map = L.map(mapContainer).setView([51.44, 5.46], 13);
    const route = createRoute("segment-style-change");

    try {
      const rendered = render(
        createElement(RouteSegmentLayer, {
          map,
          route,
          activeSegmentId: null,
          themeMode: "dark",
        }),
      );
      const initialPath = mapContainer.querySelector(".route-segment-line");

      map.fire("zoomstart");
      rendered.rerender(
        createElement(RouteSegmentLayer, {
          map,
          route,
          activeSegmentId: "segment-style-change",
          themeMode: "dark",
        }),
      );

      const updatedPath = mapContainer.querySelector(".route-segment-line");
      expect(updatedPath).toBeTruthy();
      expect(updatedPath).not.toBe(initialPath);
      expect(mapContainer.querySelectorAll(".route-segment-line")).toHaveLength(1);
    } finally {
      map.remove();
      mapContainer.remove();
    }
  });
});
