/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../../../domain/models/alerts";
import { AlertStateActionButton } from "./AlertStateActionButton";

const activeAlert: FleetAlert = {
  id: "alert-action-test",
  severity: "high",
  vehicleId: "veh-atlas-12",
  vehicleName: "Atlas 12",
  type: "Route Deviation",
  rule: "Unexpected route deviation",
  timeIso: "2026-05-08T10:46:00.000Z",
  state: "Active",
};

describe("AlertStateActionButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the tooltip outside clipped card containers", () => {
    render(
      <div data-testid="clipped-card" className="overflow-hidden">
        <AlertStateActionButton alert={activeAlert} onAlertStateChange={vi.fn()} />
      </div>,
    );

    const tooltipId = screen.getByRole("button", { name: /acknowledge route deviation/i }).getAttribute("aria-describedby");
    const tooltip = screen.getByTestId(tooltipId ?? "");

    expect(tooltip).toHaveTextContent("Acknowledge");
    expect(tooltip.parentElement).toBe(document.body);
    expect(screen.getByRole("button", { name: /acknowledge route deviation/i })).toHaveAttribute(
      "aria-describedby",
      tooltipId,
    );
  });

  it("does not render an action for resolved alerts", () => {
    render(<AlertStateActionButton alert={{ ...activeAlert, state: "Resolved" }} onAlertStateChange={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("alert-action-tooltip-alert-action-test")).not.toBeInTheDocument();
  });

  it("uses distinct tooltip ids when the same alert is rendered in multiple surfaces", () => {
    render(
      <>
        <AlertStateActionButton alert={activeAlert} onAlertStateChange={vi.fn()} />
        <AlertStateActionButton alert={activeAlert} onAlertStateChange={vi.fn()} />
      </>,
    );

    const tooltipIds = screen.getAllByRole("button").map((button) => button.getAttribute("aria-describedby"));

    expect(new Set(tooltipIds).size).toBe(2);
    tooltipIds.forEach((tooltipId) => {
      expect(tooltipId).toBeTruthy();
      expect(document.querySelectorAll(`#${tooltipId}`).length).toBe(1);
    });
  });
});
