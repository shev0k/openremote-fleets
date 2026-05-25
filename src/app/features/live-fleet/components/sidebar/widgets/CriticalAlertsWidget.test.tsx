/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../../../../../domain/models/alerts";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { CriticalAlertsWidget } from "./CriticalAlertsWidget";

function createAlertVehicle(id: string): Vehicle {
  return {
    id,
    name: `Alert ${id}`,
    plate: "BR-482-K",
    status: "alerting",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.45,
    longitude: 5.49,
    heading: 90,
    lastUpdatedIso: "2026-05-07T12:00:00.000Z",
    driverName: "Mila Janssen",
    trackerId: `35209308640365${id}`,
    assetName: "Atlas",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
  };
}

const criticalAlerts: FleetAlert[] = [
  {
    id: "alert-speed-1",
    severity: "high",
    vehicleId: "1",
    vehicleName: "Alert 1",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-05-07T12:02:00.000Z",
    state: "Active",
    sourceAttribute: "speed",
    sourceValue: 88,
  },
  {
    id: "alert-route-2",
    severity: "high",
    vehicleId: "2",
    vehicleName: "Alert 2",
    type: "Route Deviation",
    rule: "Unexpected route deviation",
    timeIso: "2026-05-07T12:01:00.000Z",
    state: "Acknowledged",
    sourceAttribute: "gpsLocation",
    sourceValue: "outside planned route",
    speedKph: 2,
  },
];

describe("CriticalAlertsWidget", () => {
  afterEach(() => {
    cleanup();
  });

  it("centers an icon-backed empty state when there are no active critical alerts", () => {
    render(
      <CriticalAlertsWidget
        activeAlertsCount={0}
        alerts={[]}
        vehicles={[]}
        onSelectVehicle={vi.fn()}
        onAlertStateChange={vi.fn()}
      />,
    );

    const emptyState = screen.getByTestId("critical-alerts-empty-state");

    expect(emptyState).toHaveTextContent("No critical alerts.");
    expect(emptyState).toHaveClass("items-center");
    expect(emptyState).toHaveClass("justify-center");
    expect(screen.getByTestId("critical-alerts-empty-state-icon")).toBeInTheDocument();
  });

  it("lets the alert list fill the resized card instead of capping its own height", () => {
    render(
      <CriticalAlertsWidget
        activeAlertsCount={3}
        alerts={criticalAlerts}
        vehicles={[createAlertVehicle("1"), createAlertVehicle("2"), createAlertVehicle("3")]}
        onSelectVehicle={vi.fn()}
        onAlertStateChange={vi.fn()}
      />,
    );

    const alertsList = screen.getByTestId("critical-alerts-list");

    expect(alertsList).toHaveClass("flex-1");
    expect(alertsList).toHaveClass("min-h-0");
    expect(alertsList).toHaveClass("overflow-y-auto");
    expect(alertsList.className).not.toContain("max-h-");
    expect(screen.queryByTestId("critical-alerts-empty-state")).not.toBeInTheDocument();
  });

  it("uses alert-time speed and keeps the restored critical alert card focus behavior", () => {
    const onSelectVehicle = vi.fn();

    render(
      <CriticalAlertsWidget
        activeAlertsCount={2}
        alerts={criticalAlerts}
        vehicles={[createAlertVehicle("1"), createAlertVehicle("2")]}
        onSelectVehicle={onSelectVehicle}
        onAlertStateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("critical-alert-card-alert-speed-1"));

    expect(onSelectVehicle).toHaveBeenCalledWith("1");
    expect(screen.getByText("88 km/h")).toBeInTheDocument();
    expect(screen.getByText("2 km/h")).toBeInTheDocument();
    expect(screen.queryByText("42 km/h")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 alert").length).toBeGreaterThan(0);
  });

  it("keeps vehicle identity rows symmetric with the speed, time, and alert count metrics", () => {
    render(
      <CriticalAlertsWidget
        activeAlertsCount={2}
        alerts={criticalAlerts}
        vehicles={[createAlertVehicle("1"), createAlertVehicle("2")]}
        onSelectVehicle={vi.fn()}
        onAlertStateChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("critical-alert-summary-alert-speed-1")).toHaveClass(
      "grid",
      "grid-cols-[minmax(0,1fr)_auto]",
      "items-stretch",
    );
    expect(screen.getByTestId("critical-alert-identity-alert-speed-1")).toHaveClass(
      "grid",
      "grid-rows-[auto_auto_auto]",
      "content-between",
    );
    expect(screen.getByTestId("critical-alert-metrics-alert-speed-1")).toHaveClass(
      "grid",
      "grid-rows-[auto_auto_auto]",
      "content-between",
      "justify-items-end",
    );
  });

  it("offers a stateful icon action with tooltips for each critical alert", () => {
    const onAlertStateChange = vi.fn();

    render(
      <CriticalAlertsWidget
        activeAlertsCount={2}
        alerts={criticalAlerts}
        vehicles={[createAlertVehicle("1"), createAlertVehicle("2")]}
        onSelectVehicle={vi.fn()}
        onAlertStateChange={onAlertStateChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /acknowledge overspeed/i }));
    fireEvent.click(screen.getByRole("button", { name: /resolve route deviation/i }));

    expect(onAlertStateChange).toHaveBeenCalledWith("alert-speed-1", "Acknowledged");
    expect(onAlertStateChange).toHaveBeenCalledWith("alert-route-2", "Resolved");
    expect(screen.getByTestId("alert-action-icon-alert-speed-1")).toHaveAttribute("data-icon-state", "acknowledge");
    expect(screen.getByTestId("alert-action-icon-alert-route-2")).toHaveAttribute("data-icon-state", "resolve");
    expect(screen.getByText("Acknowledge")).toBeInTheDocument();
    expect(screen.getByText("Resolve")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ack$/i })).not.toBeInTheDocument();
  });

  it("does not focus the vehicle when keyboarding the nested alert action", () => {
    const onSelectVehicle = vi.fn();
    const onAlertStateChange = vi.fn();

    render(
      <CriticalAlertsWidget
        activeAlertsCount={2}
        alerts={criticalAlerts}
        vehicles={[createAlertVehicle("1"), createAlertVehicle("2")]}
        onSelectVehicle={onSelectVehicle}
        onAlertStateChange={onAlertStateChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /acknowledge overspeed/i }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("button", { name: /acknowledge overspeed/i }), { key: " " });

    expect(onSelectVehicle).not.toHaveBeenCalled();
  });
});
