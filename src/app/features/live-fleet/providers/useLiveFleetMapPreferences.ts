import { useCallback, useEffect, useRef, useState } from "react";
import { useAppPreferences } from "../../../providers/AppPreferencesProvider";
import { getBrowserLocalStorage, writeLocalStorageItem } from "../../../components/shared/storage/safeStorage";
import {
  ACRYLIC_MODE_SYNC_EVENT,
  clearAcrylicModeOverride,
  dispatchAcrylicModeSync,
  readAcrylicMode,
  writeAcrylicModeOverride,
} from "../../../theme/acrylicMode";
import { LIVE_FLEET_MAP_TYPE_STORAGE_KEY } from "./liveFleetWorkspace.constants";
import type { LiveFleetMapType } from "./liveFleetWorkspace.types";
import {
  hasStoredLiveFleetMapType,
  readInitialWorkspaceOpen,
  readStoredLiveFleetMapType,
} from "./liveFleetWidgetLayout.storage";

export function useLiveFleetMapPreferences() {
  const { preferences, isLoading: isLoadingPreferences } = useAppPreferences();
  const preferredDefaultMapLayer = preferences.behavior.defaultMapLayer;
  const hasStoredMapTypeRef = useRef(hasStoredLiveFleetMapType());
  const [mapType, setMapType] = useState<LiveFleetMapType>(() => readStoredLiveFleetMapType(preferredDefaultMapLayer));
  const [isWorkspaceOpen, setWorkspaceOpen] = useState(readInitialWorkspaceOpen);

  const setStoredMapType = useCallback((nextMapType: LiveFleetMapType) => {
    hasStoredMapTypeRef.current = true;
    setMapType(nextMapType);
  }, []);

  useEffect(() => {
    if (!hasStoredMapTypeRef.current) {
      setMapType(preferredDefaultMapLayer);
    }
  }, [preferredDefaultMapLayer]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isLoadingPreferences || (!hasStoredMapTypeRef.current && mapType !== preferredDefaultMapLayer)) {
      return;
    }

    writeLocalStorageItem(LIVE_FLEET_MAP_TYPE_STORAGE_KEY, mapType);
    hasStoredMapTypeRef.current = true;
  }, [isLoadingPreferences, mapType, preferredDefaultMapLayer]);

  useEffect(() => {
    const storage = getBrowserLocalStorage();
    if (!storage || typeof window === "undefined") {
      return;
    }

    if (mapType === "default") {
      clearAcrylicModeOverride(storage);
      dispatchAcrylicModeSync(window);
      return;
    }

    if (readAcrylicMode(storage)) {
      writeAcrylicModeOverride(storage, false);
      dispatchAcrylicModeSync(window);
    }
  }, [mapType]);

  useEffect(() => {
    const storage = getBrowserLocalStorage();
    if (!storage || typeof window === "undefined" || mapType === "default") {
      return;
    }

    const enforceSolidModeForMapLayer = () => {
      if (!readAcrylicMode(storage)) {
        return;
      }

      writeAcrylicModeOverride(storage, false);
      dispatchAcrylicModeSync(window);
    };

    enforceSolidModeForMapLayer();
    window.addEventListener(ACRYLIC_MODE_SYNC_EVENT, enforceSolidModeForMapLayer);

    return () => {
      window.removeEventListener(ACRYLIC_MODE_SYNC_EVENT, enforceSolidModeForMapLayer);
    };
  }, [mapType]);

  return {
    mapType,
    setMapType: setStoredMapType,
    isWorkspaceOpen,
    setWorkspaceOpen,
  };
}
