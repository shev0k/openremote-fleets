/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences } from "../../../domain/models/preferences";
import { AppPreferencesContextProviderForTest } from "../../providers/AppPreferencesProvider.test-utils";
import { LayoutBrand } from "./LayoutBrand";

describe("LayoutBrand", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses the default OpenRemote image for the navbar logo", () => {
    render(
      <MemoryRouter>
        <AppPreferencesContextProviderForTest preferences={DEFAULT_APP_PREFERENCES}>
          <LayoutBrand />
        </AppPreferencesContextProviderForTest>
      </MemoryRouter>,
    );

    expect(screen.getByRole("img", { name: "OpenRemote Fleets logo" })).toHaveAttribute("src", "/openremote.png");
  });

  it("uses configured branding when preferences provide an application name and logo", () => {
    render(
      <MemoryRouter>
        <AppPreferencesContextProviderForTest
          preferences={mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
            branding: {
              applicationName: "North Fleet Control",
              logoUrl: "https://cdn.example/logo.svg",
              logoAltText: "North custom mark",
            },
          })}
        >
          <LayoutBrand />
        </AppPreferencesContextProviderForTest>
      </MemoryRouter>,
    );

    expect(screen.getByText("North Fleet Control")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Live Fleet" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("img", { name: "North custom mark" })).toHaveAttribute("src", "https://cdn.example/logo.svg");
    expect(screen.getByRole("img", { name: "North custom mark" })).toHaveClass("brand-glow-logo");
  });
});
