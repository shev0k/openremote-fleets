/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("react-router", () => ({
  RouterProvider: () => <div>App route content</div>,
}));

vi.mock("./routes", () => ({
  router: {},
}));

vi.mock("./providers/AppThemeProvider", () => ({
  AppThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/session/AppSessionProvider", () => ({
  AppSessionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/AppServicesProvider", () => ({
  AppServicesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./providers/AppPreferencesProvider", () => ({
  AppPreferencesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./contexts/AlertsContext", () => ({
  AlertsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an app-level desktop-only notice alongside every routed surface", () => {
    render(<App />);

    expect(screen.getByText("App route content")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Desktop view required" })).toHaveTextContent(
      "Phone and tablet layouts are not currently supported or planned.",
    );
  });
});
