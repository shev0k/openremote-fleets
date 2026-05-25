/* @vitest-environment jsdom */

/* ======== IMPORTS ======== */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LiveFleetQuickPanelId } from "../../providers/liveFleetWorkspace.types";
import { useFloatingOverlayLayouts } from "./useFloatingOverlayLayouts";

/* ======== TESTS ======== */

describe("useFloatingOverlayLayouts", () => {
  it("creates and prunes layouts for pinned vehicles and quick panels", async () => {
    const { result, rerender } = renderHook(
      ({ pinnedVehicleIds, openQuickPanelIds }) =>
        useFloatingOverlayLayouts({
          pinnedVehicleIds,
          openQuickPanelIds,
        }),
      {
        initialProps: {
          pinnedVehicleIds: ["veh-1"],
          openQuickPanelIds: ["alerts" as LiveFleetQuickPanelId],
        },
      },
    );

    await waitFor(() => {
      expect(result.current.pinnedWindowLayouts["veh-1"]).toMatchObject({
        isCollapsed: false,
        position: null,
      });
      expect(result.current.quickPanelLayouts.alerts).toMatchObject({
        position: null,
      });
    });

    rerender({
      pinnedVehicleIds: [],
      openQuickPanelIds: [],
    });

    await waitFor(() => {
      expect(result.current.pinnedWindowLayouts).toEqual({});
      expect(result.current.quickPanelLayouts).toEqual({});
    });
  });

  it("updates layout state and raises focused overlays", async () => {
    const { result } = renderHook(() =>
      useFloatingOverlayLayouts({
        pinnedVehicleIds: ["veh-1"],
        openQuickPanelIds: ["alerts" as LiveFleetQuickPanelId],
      }),
    );

    await waitFor(() => {
      expect(result.current.pinnedWindowLayouts["veh-1"]).toBeDefined();
      expect(result.current.quickPanelLayouts.alerts).toBeDefined();
    });

    const pinnedStartZIndex = result.current.pinnedWindowLayouts["veh-1"].zIndex;
    const quickStartZIndex = result.current.quickPanelLayouts.alerts?.zIndex ?? 0;

    act(() => {
      result.current.updatePinnedWindowLayout("veh-1", {
        isCollapsed: true,
        position: { x: 24, y: 32 },
      });
      result.current.updateQuickPanelLayout("alerts", {
        position: { x: 48, y: 64 },
      });
      result.current.focusPinnedVehicle("veh-1");
      result.current.focusQuickPanel("alerts");
    });

    expect(result.current.pinnedWindowLayouts["veh-1"]).toMatchObject({
      isCollapsed: true,
      position: { x: 24, y: 32 },
      zIndex: expect.any(Number),
    });
    expect(result.current.pinnedWindowLayouts["veh-1"].zIndex).toBeGreaterThan(pinnedStartZIndex);
    expect(result.current.quickPanelLayouts.alerts).toMatchObject({
      position: { x: 48, y: 64 },
      zIndex: expect.any(Number),
    });
    expect(result.current.quickPanelLayouts.alerts?.zIndex).toBeGreaterThan(quickStartZIndex);
  });
});
