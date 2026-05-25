/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeProvider } from "../providers/AppThemeProvider";
import { Layout } from "./Layout";

vi.mock("../contexts/AlertsContext", () => ({
  useAlerts: () => ({
    alerts: [],
    activeAlertsCount: 0,
  }),
}));

vi.mock("./layout/ProfilePopover", () => ({
  ProfilePopover: () => <button type="button">Fleet user</button>,
}));

function renderLayout(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppThemeProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div>Live Fleet page</div>} />
            <Route path="alerts" element={<div>Alerts page</div>} />
          </Route>
        </Routes>
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("Layout", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: createStorageMock(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the removed navbar search control", () => {
    const { container } = renderLayout();

    expect(screen.getByText("Live Fleet page")).toBeInTheDocument();
    expect(container.querySelector(".lucide-search")).toBeNull();
  });

  it("keeps the dense desktop navigation hidden until wide screens", () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("hidden", "xl:flex");
    expect(screen.getByRole("navigation", { name: "Compact navigation" })).toHaveClass("xl:hidden");
  });

  it("opens Live Fleet when the brand is clicked from another route", () => {
    renderLayout("/alerts");

    expect(screen.getByText("Alerts page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Open Live Fleet" }));

    expect(screen.getByText("Live Fleet page")).toBeInTheDocument();
  });
});
