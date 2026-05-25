/* @vitest-environment jsdom */

import L from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Vehicle } from "../../../domain/models/vehicle";
import { getSelectedVehicleFocusTarget } from "./mapFocus";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "./mapTileConfig";
import { fitDefaultMapBounds, playMapFocusTravel, resetMapFocusTravelElement } from "./useCustomMapFocus";

function createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "vehicle-1",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.45,
    longitude: 5.49,
    heading: 90,
    lastUpdatedIso: "2026-03-29T09:12:00.000Z",
    driverName: "Driver",
    trackerId: "352093086403655",
    assetName: "Atlas",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    ...overrides,
  };
}

function createFitMap() {
  return {
    fitBounds: vi.fn(),
    setView: vi.fn(),
  };
}

describe("custom map default fitting", () => {
  it("prefers route bounds when route fitting is the default scope", () => {
    const map = createFitMap();
    const routeLine: [number, number][] = [
      [51.4416, 5.4697],
      [51.4492, 5.4814],
    ];

    fitDefaultMapBounds({
      map: map as unknown as L.Map,
      vehicles: [
        createVehicle({ id: "vehicle-1", latitude: 51.3, longitude: 5.2 }),
        createVehicle({ id: "vehicle-2", latitude: 51.7, longitude: 5.8 }),
      ],
      routeLine,
      fitPaddingBottomPx: 260,
      defaultFitScope: "route",
      animate: false,
    });

    const [bounds, options] = map.fitBounds.mock.calls[0] as [L.LatLngBounds, L.FitBoundsOptions];
    expect(bounds.getSouth()).toBeCloseTo(51.4416);
    expect(bounds.getWest()).toBeCloseTo(5.4697);
    expect(bounds.getNorth()).toBeCloseTo(51.4492);
    expect(bounds.getEast()).toBeCloseTo(5.4814);
    expect(options).toMatchObject({
      paddingTopLeft: [72, 72],
      paddingBottomRight: [72, 332],
      maxZoom: 14,
      animate: false,
    });
    expect(map.setView).not.toHaveBeenCalled();
  });

  it("uses fleet bounds when fleet fitting is the default scope", () => {
    const map = createFitMap();

    fitDefaultMapBounds({
      map: map as unknown as L.Map,
      vehicles: [
        createVehicle({ id: "vehicle-1", latitude: 51.3, longitude: 5.2 }),
        createVehicle({ id: "vehicle-2", latitude: 51.7, longitude: 5.8 }),
      ],
      routeLine: [
        [51.4416, 5.4697],
        [51.4492, 5.4814],
      ],
      fitPaddingBottomPx: 260,
      defaultFitScope: "fleet",
      animate: true,
    });

    const [bounds, options] = map.fitBounds.mock.calls[0] as [L.LatLngBounds, L.FitBoundsOptions];
    expect(bounds.getSouth()).toBeCloseTo(51.3);
    expect(bounds.getWest()).toBeCloseTo(5.2);
    expect(bounds.getNorth()).toBeCloseTo(51.7);
    expect(bounds.getEast()).toBeCloseTo(5.8);
    expect(options).toMatchObject({
      padding: [52, 52],
      maxZoom: 13,
      animate: true,
    });
  });

  it("falls back to a single vehicle or the default map view", () => {
    const singleVehicleMap = createFitMap();
    const emptyMap = createFitMap();

    fitDefaultMapBounds({
      map: singleVehicleMap as unknown as L.Map,
      vehicles: [createVehicle({ latitude: 51.5, longitude: 5.5 })],
      routeLine: [],
      fitPaddingBottomPx: 0,
      defaultFitScope: "route",
      animate: true,
    });

    fitDefaultMapBounds({
      map: emptyMap as unknown as L.Map,
      vehicles: [],
      routeLine: [],
      fitPaddingBottomPx: 0,
      defaultFitScope: "route",
      animate: false,
    });

    expect(singleVehicleMap.setView).toHaveBeenCalledWith([51.5, 5.5], 14, { animate: true });
    expect(emptyMap.setView).toHaveBeenCalledWith(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
  });

  it("excludes vehicles without valid locations from fleet fitting", () => {
    const map = createFitMap();

    fitDefaultMapBounds({
      map: map as unknown as L.Map,
      vehicles: [
        createVehicle({ id: "missing-location", hasLocation: false, latitude: 0, longitude: 0 }),
        createVehicle({ id: "valid-location", latitude: 51.5, longitude: 5.5 }),
      ],
      routeLine: [],
      fitPaddingBottomPx: 0,
      defaultFitScope: "fleet",
      animate: true,
    });

    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setView).toHaveBeenCalledWith([51.5, 5.5], 14, { animate: true });
  });

  it("does not focus a selected vehicle without a valid location", () => {
    expect(
      getSelectedVehicleFocusTarget(
        [
          createVehicle({
            id: "missing-location",
            hasLocation: false,
            latitude: 0,
            longitude: 0,
          }),
        ],
        "missing-location",
        null,
      ),
    ).toBeNull();
  });
});

describe("custom map focus travel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies and clears the temporary focus travel CSS properties", () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    const timeoutRef = { current: null as number | null };

    playMapFocusTravel(element, timeoutRef, {
      className: "custom-map-focus-travel",
      resetDelayMs: 620,
      translateX: 42,
      translateY: -18,
      scale: 0.94,
    });

    expect(element.classList.contains("custom-map-focus-travel")).toBe(true);
    expect(element.style.getPropertyValue("--custom-map-focus-translate-x")).toBe("42px");
    expect(element.style.getPropertyValue("--custom-map-focus-translate-y")).toBe("-18px");
    expect(element.style.getPropertyValue("--custom-map-focus-scale")).toBe("0.94");

    vi.advanceTimersByTime(620);

    expect(element.classList.contains("custom-map-focus-travel")).toBe(false);
    expect(element.style.getPropertyValue("--custom-map-focus-translate-x")).toBe("");
    expect(element.style.getPropertyValue("--custom-map-focus-translate-y")).toBe("");
    expect(element.style.getPropertyValue("--custom-map-focus-scale")).toBe("");
    expect(timeoutRef.current).toBeNull();
  });

  it("clears pending focus travel state without waiting for the timeout", () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    const timeoutRef = { current: window.setTimeout(() => undefined, 620) };

    element.classList.add("custom-map-focus-travel");
    element.style.setProperty("--custom-map-focus-translate-x", "42px");
    element.style.setProperty("--custom-map-focus-translate-y", "-18px");
    element.style.setProperty("--custom-map-focus-scale", "0.94");

    resetMapFocusTravelElement(element, timeoutRef);

    expect(element.classList.contains("custom-map-focus-travel")).toBe(false);
    expect(element.style.getPropertyValue("--custom-map-focus-translate-x")).toBe("");
    expect(element.style.getPropertyValue("--custom-map-focus-translate-y")).toBe("");
    expect(element.style.getPropertyValue("--custom-map-focus-scale")).toBe("");
    expect(timeoutRef.current).toBeNull();
  });
});
