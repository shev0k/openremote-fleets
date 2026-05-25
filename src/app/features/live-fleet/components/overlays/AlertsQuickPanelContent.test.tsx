/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../../../../domain/models/alerts";
import { AlertsQuickPanelContent } from "./AlertsQuickPanelContent";

const alerts: FleetAlert[] = [
  {
    id: "alert-1",
    severity: "high",
    vehicleId: "veh-nimbus-03",
    vehicleName: "Nimbus 03",
    type: "External voltage low",
    rule: "externalVoltage below 11.5 V",
    timeIso: "2026-05-06T08:45:00Z",
    state: "Active",
    sourceAttribute: "externalVoltage",
    sourceValue: 11.2,
  },
  {
    id: "alert-2",
    severity: "medium",
    vehicleId: "veh-atlas-12",
    vehicleName: "Atlas 12",
    type: "Harsh braking",
    rule: "ioElement harshBraking detected",
    timeIso: "2026-05-06T08:39:00Z",
    state: "Acknowledged",
    sourceAttribute: "harshBraking",
    sourceValue: true,
  },
  {
    id: "alert-3",
    severity: "low",
    vehicleId: "veh-resolved",
    vehicleName: "Resolved 01",
    type: "Resolved alarm",
    rule: "already resolved",
    timeIso: "2026-05-06T08:10:00Z",
    state: "Resolved",
  },
];

describe("AlertsQuickPanelContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("summarizes unresolved alerts and supports focusing the affected vehicle", () => {
    const onSelectVehicle = vi.fn();

    render(<AlertsQuickPanelContent alerts={alerts} onSelectVehicle={onSelectVehicle} />);

    expect(screen.getByText("Open alerts")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0);
    expect(screen.getByText("External voltage low")).toBeInTheDocument();
    expect(screen.getByText("externalVoltage")).toBeInTheDocument();
    expect(screen.getByText("11.2")).toBeInTheDocument();
    expect(screen.queryByText("Resolved alarm")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /focus nimbus 03/i }));
    expect(onSelectVehicle).toHaveBeenCalledWith("veh-nimbus-03");
  });

  it("shows valid falsy source values", () => {
    render(
      <AlertsQuickPanelContent
        alerts={[
          { ...alerts[0], id: "alert-zero", sourceAttribute: "speed", sourceValue: 0 },
          { ...alerts[1], id: "alert-false", sourceAttribute: "movement", sourceValue: false },
        ]}
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("keeps compact summary cards constrained inside the overlay width", () => {
    render(<AlertsQuickPanelContent alerts={alerts} />);

    expect(screen.getByTestId("alerts-summary-open")).toHaveClass("min-w-0");
    expect(screen.getByTestId("alerts-summary-critical")).toHaveClass("min-w-0");
    expect(screen.getByTestId("alerts-summary-acknowledged")).toHaveClass("min-w-0");
    expect(screen.getByTestId("alerts-summary-acknowledged-label")).toHaveClass("truncate");
  });

  it("shows a quiet empty state when every alert is resolved", () => {
    render(<AlertsQuickPanelContent alerts={alerts.filter((alert) => alert.state === "Resolved")} />);

    expect(screen.getByText("No unresolved alerts.")).toBeInTheDocument();
    expect(screen.getByText("Fleet alert overlays will appear here when live rules need attention.")).toBeInTheDocument();
  });
});
