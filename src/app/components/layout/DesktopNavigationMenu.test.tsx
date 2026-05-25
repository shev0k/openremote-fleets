/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DesktopNavigationMenu } from "./DesktopNavigationMenu";

describe("DesktopNavigationMenu", () => {
  it("uses brand-derived glow styling for the active navigation indicator", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <DesktopNavigationMenu activeAlertsCount={0} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Live Fleet" })).toHaveClass("text-brand");
    expect(container.querySelector(".brand-glow-nav")).toBeInTheDocument();
  });

  it("uses brand-derived glow styling for the active alerts badge", () => {
    render(
      <MemoryRouter initialEntries={["/alerts"]}>
        <DesktopNavigationMenu activeAlertsCount={4} />
      </MemoryRouter>,
    );

    expect(screen.getByText("4")).toHaveClass("brand-glow-badge");
  });
});
