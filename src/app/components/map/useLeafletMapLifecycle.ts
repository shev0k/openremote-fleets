import { useEffect, useRef, useState, type RefObject } from "react";
import L from "leaflet";
import { attachMapSizeInvalidation } from "./mapLifecycle";
import { getStableLeafletMapOptions } from "./mapTileConfig";

interface UseLeafletMapLifecycleOptions {
  createMap?: (element: HTMLElement, options: L.MapOptions) => L.Map;
  attachSizeInvalidation?: typeof attachMapSizeInvalidation;
}

const createLeafletMap = (element: HTMLElement, options: L.MapOptions) => L.map(element, options);

export function useLeafletMapLifecycle(
  mapElementRef: RefObject<HTMLDivElement | null>,
  {
    createMap = createLeafletMap,
    attachSizeInvalidation = attachMapSizeInvalidation,
  }: UseLeafletMapLifecycleOptions = {},
) {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) {
      return;
    }

    const map = createMap(mapElementRef.current, getStableLeafletMapOptions());

    mapInstanceRef.current = map;
    setLeafletMap(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setLeafletMap(null);
    };
  }, [createMap, mapElementRef]);

  useEffect(() => {
    if (!leafletMap || !mapElementRef.current) {
      return;
    }

    return attachSizeInvalidation(leafletMap, mapElementRef.current);
  }, [attachSizeInvalidation, leafletMap, mapElementRef]);

  return { leafletMap, mapInstanceRef };
}
