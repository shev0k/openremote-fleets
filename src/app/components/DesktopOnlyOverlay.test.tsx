/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
// @ts-expect-error This test reads a local CSS file without adding Node globals to the app tsconfig.
import { readFileSync } from "node:fs";
import { DesktopOnlyOverlay } from "./DesktopOnlyOverlay";

const themeCss = readFileSync("src/styles/theme.css", "utf8");

describe("DesktopOnlyOverlay", () => {
  it("states that phone and tablet layouts are outside the intended app surface", () => {
    render(<DesktopOnlyOverlay />);

    const dialog = screen.getByRole("dialog", { name: "Desktop view required" });

    expect(dialog).toHaveClass("desktop-only-overlay");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("OpenRemote Fleets is intended for desktop workstations.");
    expect(dialog).toHaveTextContent("Phone and tablet layouts are not currently supported or planned.");
  });

  it("hides the gate only for desktop-class fine-pointer viewports", () => {
    expect(themeCss).toContain(".desktop-only-overlay");
    expect(themeCss).toContain("@media (min-width: 1280px) and (hover: hover) and (pointer: fine)");
    expect(themeCss).toMatch(/\.desktop-only-overlay\s*\{[\s\S]*?display:\s*none;/);
  });
});
