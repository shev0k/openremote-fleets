/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type L from "leaflet";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { attachMapSizeInvalidation } from "./mapLifecycle";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "./mapTileConfig";
import { useLeafletMapLifecycle } from "./useLeafletMapLifecycle";

function LifecycleHarness({
  createMap,
  attachSizeInvalidation,
}: {
  createMap: (element: HTMLElement, options: L.MapOptions) => L.Map;
  attachSizeInvalidation: typeof attachMapSizeInvalidation;
}) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const { leafletMap } = useLeafletMapLifecycle(mapElementRef, {
    createMap,
    attachSizeInvalidation,
  });

  return <div ref={mapElementRef} data-testid="map" data-ready={leafletMap ? "ready" : "pending"} />;
}

describe("Leaflet map lifecycle hook", () => {
  it("creates the map, attaches size invalidation, and removes the map on unmount", () => {
    const cleanupSizeInvalidation = vi.fn();
    const map = {
      remove: vi.fn(),
    } as unknown as L.Map;
    const createMap = vi.fn(() => map);
    const attachSizeInvalidation = vi.fn(() => cleanupSizeInvalidation);

    const { unmount } = render(
      <LifecycleHarness createMap={createMap} attachSizeInvalidation={attachSizeInvalidation} />,
    );

    const mapElement = screen.getByTestId("map");
    expect(mapElement.getAttribute("data-ready")).toBe("ready");
    expect(createMap).toHaveBeenCalledWith(
      mapElement,
      expect.objectContaining({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      }),
    );
    expect(attachSizeInvalidation).toHaveBeenCalledWith(map, mapElement);

    unmount();

    expect(cleanupSizeInvalidation).toHaveBeenCalled();
    expect(map.remove).toHaveBeenCalled();
  });
});
