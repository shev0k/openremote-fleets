/* @vitest-environment jsdom */

import type L from "leaflet";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../../../domain/models/preferences";
import type { Vehicle } from "../../../domain/models/vehicle";
import { syncPolylineLayer, syncTileLayer, syncVehicleMarkerLayer } from "./useCustomMapLayers";

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

function createMarker() {
  const handlers: Record<string, () => void> = {};
  const marker = {
    addTo: vi.fn(() => marker),
    bindTooltip: vi.fn(() => marker),
    on: vi.fn((eventName: string, handler: () => void) => {
      handlers[eventName] = handler;
      return marker;
    }),
    setIcon: vi.fn(() => marker),
    setLatLng: vi.fn(() => marker),
    trigger: (eventName: string) => handlers[eventName]?.(),
  };

  return marker;
}

describe("custom map tile layer", () => {
  it("replaces the previous tile layer with the configured base map", () => {
    const map = { removeLayer: vi.fn() };
    const previousLayer = { id: "previous" };
    const nextLayer = { addTo: vi.fn(() => nextLayer) };
    const tileLayerRef = { current: previousLayer as unknown as L.TileLayer | null };
    const createTileLayer = vi.fn(() => nextLayer as unknown as L.TileLayer);

    syncTileLayer({
      map: map as unknown as L.Map,
      tileLayerRef,
      mapType: "default",
      themeMode: "dark",
      createTileLayer,
    });

    expect(map.removeLayer).toHaveBeenCalledWith(previousLayer);
    expect(createTileLayer).toHaveBeenCalledWith(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      expect.objectContaining({
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        className: "map-tile-dark-neutral-readable",
      }),
    );
    expect(nextLayer.addTo).toHaveBeenCalledWith(map);
    expect(tileLayerRef.current).toBe(nextLayer);
  });
});

describe("custom map vehicle marker layer", () => {
  it("removes stale markers, updates existing markers, and creates clickable new markers", () => {
    const map = { removeLayer: vi.fn() };
    const staleMarker = createMarker();
    const existingMarker = createMarker();
    const createdMarker = createMarker();
    const markersRef = {
      current: {
        stale: staleMarker as unknown as L.Marker,
        existing: existingMarker as unknown as L.Marker,
      },
    };
    const onVehicleClick = vi.fn();
    const createLeafletMarker = vi.fn(() => createdMarker as unknown as L.Marker);
    const createIconForVehicle = vi.fn((vehicle: Vehicle, isSelected: boolean) => `${vehicle.id}:${isSelected}` as unknown as L.DivIcon);
    const createTooltipHtmlForVehicle = vi.fn((vehicle: Vehicle) => `<b>${vehicle.id}</b>`);

    syncVehicleMarkerLayer({
      map: map as unknown as L.Map,
      markersRef,
      vehicles: [
        createVehicle({ id: "existing", latitude: 51.1, longitude: 5.1 }),
        createVehicle({ id: "created", latitude: 51.2, longitude: 5.2 }),
      ],
      selectedVehicleId: "created",
      onVehicleClick,
      themeMode: "light",
      mapColors: DEFAULT_APP_PREFERENCES.mapColors,
      createLeafletMarker,
      createIconForVehicle,
      createTooltipHtmlForVehicle,
    });

    expect(map.removeLayer).toHaveBeenCalledWith(staleMarker);
    expect(markersRef.current.stale).toBeUndefined();
    expect(existingMarker.setLatLng).toHaveBeenCalledWith([51.1, 5.1]);
    expect(existingMarker.setIcon).toHaveBeenCalledWith("existing:false");
    expect(existingMarker.bindTooltip).toHaveBeenCalledWith("<b>existing</b>", expect.objectContaining({ direction: "top" }));
    expect(createLeafletMarker).toHaveBeenCalledWith([51.2, 5.2], { icon: "created:true" });
    expect(createdMarker.addTo).toHaveBeenCalledWith(map);
    expect(createdMarker.bindTooltip).toHaveBeenCalledWith("<b>created</b>", expect.objectContaining({ offset: [0, -18] }));

    createdMarker.trigger("click");

    expect(onVehicleClick).toHaveBeenCalledWith("created");
  });

  it("renders clickable vehicle marker copies for visible repeated worlds", () => {
    const map = {
      removeLayer: vi.fn(),
      getZoom: vi.fn(() => 0),
      project: vi.fn(() => ({ x: 128, y: 128 })),
      getPixelBounds: vi.fn(() => ({
        min: { x: -260, y: -120 },
        max: { x: 520, y: 360 },
      })),
      getPixelWorldBounds: vi.fn(() => ({
        getSize: () => ({ x: 256, y: 256 }),
      })),
    };
    const markersRef = { current: {} as Record<string, L.Marker> };
    const createdMarkers = [createMarker(), createMarker(), createMarker()];
    let markerIndex = 0;
    const onVehicleClick = vi.fn();
    const createLeafletMarker = vi.fn((latLng: L.LatLngExpression, _options?: L.MarkerOptions) => {
      void latLng;
      return createdMarkers[markerIndex++] as unknown as L.Marker;
    });

    syncVehicleMarkerLayer({
      map: map as unknown as L.Map,
      markersRef,
      vehicles: [createVehicle({ id: "vehicle-1", latitude: 51.45, longitude: 5.49 })],
      selectedVehicleId: "vehicle-1",
      onVehicleClick,
      themeMode: "light",
      mapColors: DEFAULT_APP_PREFERENCES.mapColors,
      createLeafletMarker,
    });

    expect(createLeafletMarker.mock.calls.map(([latLng]) => latLng)).toEqual([
      [51.45, -354.51],
      [51.45, 5.49],
      [51.45, 365.49],
    ]);

    createdMarkers.forEach((marker) => marker.trigger("click"));

    expect(onVehicleClick).toHaveBeenCalledTimes(3);
    expect(onVehicleClick).toHaveBeenNthCalledWith(1, "vehicle-1");
    expect(onVehicleClick).toHaveBeenNthCalledWith(2, "vehicle-1");
    expect(onVehicleClick).toHaveBeenNthCalledWith(3, "vehicle-1");
  });

  it("does not render a marker for a vehicle without a valid location", () => {
    const map = { removeLayer: vi.fn() };
    const markersRef = { current: {} as Record<string, L.Marker> };
    const createLeafletMarker = vi.fn();

    syncVehicleMarkerLayer({
      map: map as unknown as L.Map,
      markersRef,
      vehicles: [
        createVehicle({
          hasLocation: false,
          latitude: 0,
          longitude: 0,
        }),
      ],
      themeMode: "light",
      mapColors: DEFAULT_APP_PREFERENCES.mapColors,
      createLeafletMarker,
    });

    expect(createLeafletMarker).not.toHaveBeenCalled();
    expect(markersRef.current).toEqual({});
  });

  it("updates existing marker click handlers when the callback changes", () => {
    const map = { removeLayer: vi.fn() };
    const createdMarker = createMarker();
    const markersRef = { current: {} as Record<string, L.Marker> };
    const firstClick = vi.fn();
    const secondClick = vi.fn();
    const createLeafletMarker = vi.fn(() => createdMarker as unknown as L.Marker);

    syncVehicleMarkerLayer({
      map: map as unknown as L.Map,
      markersRef,
      vehicles: [createVehicle({ id: "vehicle-1" })],
      onVehicleClick: firstClick,
      themeMode: "light",
      mapColors: DEFAULT_APP_PREFERENCES.mapColors,
      createLeafletMarker,
    });

    syncVehicleMarkerLayer({
      map: map as unknown as L.Map,
      markersRef,
      vehicles: [createVehicle({ id: "vehicle-1" })],
      onVehicleClick: secondClick,
      themeMode: "light",
      mapColors: DEFAULT_APP_PREFERENCES.mapColors,
      createLeafletMarker,
    });

    createdMarker.trigger("click");

    expect(firstClick).not.toHaveBeenCalled();
    expect(secondClick).toHaveBeenCalledWith("vehicle-1");
  });
});

describe("custom map polyline layer", () => {
  it("creates, updates, and removes a managed polyline layer", () => {
    const map = { removeLayer: vi.fn() };
    const createdPolyline = {
      addTo: vi.fn(() => createdPolyline),
      redraw: vi.fn(),
      setLatLngs: vi.fn(),
      setStyle: vi.fn(),
    };
    const existingPolyline = {
      redraw: vi.fn(),
      setLatLngs: vi.fn(),
      setStyle: vi.fn(),
    };
    const polylineRef = { current: null as L.Polyline | null };
    const createPolyline = vi.fn(() => createdPolyline as unknown as L.Polyline);
    const line: [number, number][] = [
      [51.4416, 5.4697],
      [51.4492, 5.4814],
    ];

    syncPolylineLayer({
      map: map as unknown as L.Map,
      polylineRef,
      line,
      color: "#123456",
      shouldRender: true,
      polylineOptions: {
        opacity: 0.95,
        weight: 3,
        dashArray: "7 5",
        smoothFactor: 0,
      },
      createPolyline,
    });

    expect(createPolyline).toHaveBeenCalledWith(line, {
      color: "#123456",
      opacity: 0.95,
      weight: 3,
      dashArray: "7 5",
      smoothFactor: 0,
    });
    expect(createdPolyline.addTo).toHaveBeenCalledWith(map);
    expect(polylineRef.current).toBe(createdPolyline);

    polylineRef.current = existingPolyline as unknown as L.Polyline;
    syncPolylineLayer({
      map: map as unknown as L.Map,
      polylineRef,
      line,
      color: "#abcdef",
      shouldRender: true,
      polylineOptions: {
        opacity: 1,
        weight: 5,
        smoothFactor: 0,
      },
      createPolyline,
    });

    expect(existingPolyline.setLatLngs).toHaveBeenCalledWith(line);
    expect(existingPolyline.setStyle).toHaveBeenCalledWith({ color: "#abcdef" });
    expect(existingPolyline.redraw).toHaveBeenCalled();

    syncPolylineLayer({
      map: map as unknown as L.Map,
      polylineRef,
      line,
      color: "#abcdef",
      shouldRender: false,
      polylineOptions: {
        opacity: 1,
        weight: 5,
        smoothFactor: 0,
      },
      createPolyline,
    });

    expect(map.removeLayer).toHaveBeenCalledWith(existingPolyline);
    expect(polylineRef.current).toBeNull();
  });
});
