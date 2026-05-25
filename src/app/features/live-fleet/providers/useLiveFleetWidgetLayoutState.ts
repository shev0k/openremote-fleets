import { useCallback, useEffect, useState } from "react";
import { LIVE_FLEET_LAYOUT_STORAGE_KEY } from "./liveFleetWorkspace.constants";
import type {
  LiveFleetWidgetId,
  LiveFleetWidgetLayoutState,
  LiveFleetWidgetReorderDirection,
  LiveFleetWorkspaceTab,
} from "./liveFleetWorkspace.types";
import { readStoredLiveFleetLayout, sortWidgetIdsByOrder } from "./liveFleetWidgetLayout.storage";
import { writeLocalStorageItem } from "../../../components/shared/storage/safeStorage";

export function useLiveFleetWidgetLayoutState() {
  const [widgetLayout, setWidgetLayout] = useState<LiveFleetWidgetLayoutState>(() => readStoredLiveFleetLayout());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    writeLocalStorageItem(LIVE_FLEET_LAYOUT_STORAGE_KEY, JSON.stringify(widgetLayout));
  }, [widgetLayout]);

  const setActiveTab = useCallback((tab: LiveFleetWorkspaceTab) => {
    setWidgetLayout((current) => ({ ...current, activeTab: tab }));
  }, []);

  const showWidget = useCallback((widgetId: LiveFleetWidgetId) => {
    setWidgetLayout((current) =>
      current.visibleWidgetIds.includes(widgetId)
        ? current
        : {
            ...current,
            visibleWidgetIds: sortWidgetIdsByOrder([...current.visibleWidgetIds, widgetId], current.widgetOrderIds),
          },
    );
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: LiveFleetWidgetId) => {
    setWidgetLayout((current) => {
      const alreadyVisible = current.visibleWidgetIds.includes(widgetId);
      const nextVisibleWidgetIds = alreadyVisible
        ? current.visibleWidgetIds.filter((id) => id !== widgetId)
        : sortWidgetIdsByOrder([...current.visibleWidgetIds, widgetId], current.widgetOrderIds);

      return {
        ...current,
        visibleWidgetIds: nextVisibleWidgetIds,
      };
    });
  }, []);

  const moveWidget = useCallback((widgetId: LiveFleetWidgetId, targetIndex: number) => {
    setWidgetLayout((current) => {
      const index = current.widgetOrderIds.indexOf(widgetId);
      const boundedTargetIndex = Math.max(0, Math.min(current.widgetOrderIds.length - 1, targetIndex));

      if (index < 0 || boundedTargetIndex === index) {
        return current;
      }

      const widgetOrderIds = [...current.widgetOrderIds];
      widgetOrderIds.splice(index, 1);
      widgetOrderIds.splice(boundedTargetIndex, 0, widgetId);

      return {
        ...current,
        widgetOrderIds,
        visibleWidgetIds: sortWidgetIdsByOrder(current.visibleWidgetIds, widgetOrderIds),
      };
    });
  }, []);

  const reorderWidget = useCallback((widgetId: LiveFleetWidgetId, direction: LiveFleetWidgetReorderDirection) => {
    setWidgetLayout((current) => {
      const index = current.widgetOrderIds.indexOf(widgetId);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const boundedTargetIndex = Math.max(0, Math.min(current.widgetOrderIds.length - 1, targetIndex));
      if (boundedTargetIndex === index) {
        return current;
      }

      const widgetOrderIds = [...current.widgetOrderIds];
      widgetOrderIds.splice(index, 1);
      widgetOrderIds.splice(boundedTargetIndex, 0, widgetId);

      return {
        ...current,
        widgetOrderIds,
        visibleWidgetIds: sortWidgetIdsByOrder(current.visibleWidgetIds, widgetOrderIds),
      };
    });
  }, []);

  return {
    widgetLayout,
    setActiveTab,
    showWidget,
    toggleWidgetVisibility,
    reorderWidget,
    moveWidget,
  };
}
