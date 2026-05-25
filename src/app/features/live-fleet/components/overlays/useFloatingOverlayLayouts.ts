/* ======== IMPORTS ======== */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveFleetQuickPanelId } from "../../providers/liveFleetWorkspace.types";
import type { FloatingPanelLayoutState, PinnedWindowLayoutState } from "./overlayLayout.types";

/* ======== TYPES ======== */

export interface FloatingOverlayLayoutsInput {
  pinnedVehicleIds: string[];
  openQuickPanelIds: LiveFleetQuickPanelId[];
}

/* ======== HELPERS ======== */

function buildLayoutKey(values: readonly string[]) {
  return JSON.stringify(values);
}

/* ======== HOOK ======== */

export function useFloatingOverlayLayouts({ pinnedVehicleIds, openQuickPanelIds }: FloatingOverlayLayoutsInput) {
  const pinnedWindowZIndexRef = useRef(0);
  const quickPanelZIndexRef = useRef(0);
  const pinnedVehicleIdsKey = buildLayoutKey(pinnedVehicleIds);
  const openQuickPanelIdsKey = buildLayoutKey(openQuickPanelIds);

  const [pinnedWindowLayouts, setPinnedWindowLayouts] = useState<Record<string, PinnedWindowLayoutState>>({});
  const [quickPanelLayouts, setQuickPanelLayouts] = useState<Partial<Record<LiveFleetQuickPanelId, FloatingPanelLayoutState>>>({});

  useEffect(() => {
    setPinnedWindowLayouts((current) => {
      const nextLayouts = Object.fromEntries(
        Object.entries(current).filter(([vehicleId]) => pinnedVehicleIds.includes(vehicleId)),
      ) as Record<string, PinnedWindowLayoutState>;

      pinnedVehicleIds.forEach((vehicleId, index) => {
        if (!nextLayouts[vehicleId]) {
          pinnedWindowZIndexRef.current += 1;
          nextLayouts[vehicleId] = {
            isCollapsed: false,
            position: null,
            zIndex: pinnedWindowZIndexRef.current + index,
          };
        }
      });

      return nextLayouts;
    });
  }, [pinnedVehicleIdsKey]);

  const updatePinnedWindowLayout = useCallback((vehicleId: string, nextLayout: Partial<PinnedWindowLayoutState>) => {
    setPinnedWindowLayouts((current) => ({
      ...current,
      [vehicleId]: {
        ...(current[vehicleId] ?? {
          isCollapsed: false,
          position: null,
          zIndex: 0,
        }),
        ...nextLayout,
      },
    }));
  }, []);

  const focusPinnedVehicle = useCallback(
    (vehicleId: string) => {
      pinnedWindowZIndexRef.current += 1;
      updatePinnedWindowLayout(vehicleId, { zIndex: pinnedWindowZIndexRef.current });
    },
    [updatePinnedWindowLayout],
  );

  useEffect(() => {
    setQuickPanelLayouts((current) => {
      const nextLayouts: Partial<Record<LiveFleetQuickPanelId, FloatingPanelLayoutState>> = {};
      let hasChanged = Object.keys(current).length !== openQuickPanelIds.length;

      openQuickPanelIds.forEach((panelId, index) => {
        const existingLayout = current[panelId];
        if (existingLayout) {
          nextLayouts[panelId] = existingLayout;
          return;
        }

        quickPanelZIndexRef.current += 1;
        nextLayouts[panelId] = {
          position: null,
          zIndex: quickPanelZIndexRef.current + index,
        };
        hasChanged = true;
      });

      if (!hasChanged) {
        return current;
      }

      return nextLayouts;
    });
  }, [openQuickPanelIdsKey]);

  const updateQuickPanelLayout = useCallback((panelId: LiveFleetQuickPanelId, nextLayout: Partial<FloatingPanelLayoutState>) => {
    setQuickPanelLayouts((current) => ({
      ...current,
      [panelId]: {
        ...(current[panelId] ?? {
          position: null,
          zIndex: 0,
        }),
        ...nextLayout,
      },
    }));
  }, []);

  const focusQuickPanel = useCallback(
    (panelId: LiveFleetQuickPanelId) => {
      quickPanelZIndexRef.current += 1;
      updateQuickPanelLayout(panelId, { zIndex: quickPanelZIndexRef.current });
    },
    [updateQuickPanelLayout],
  );

  return {
    pinnedWindowLayouts,
    quickPanelLayouts,
    updatePinnedWindowLayout,
    focusPinnedVehicle,
    updateQuickPanelLayout,
    focusQuickPanel,
  };
}
