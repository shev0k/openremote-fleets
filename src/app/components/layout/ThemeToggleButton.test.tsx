/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { AppThemeProvider } from "../../providers/AppThemeProvider";

const THEME_STORAGE_KEY = "openremote-theme";

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

describe("ThemeToggleButton", () => {
  beforeAll(() => {
    const localStorageMock = createStorageMock();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      writable: true,
      value: localStorageMock,
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("updates the global theme from the appearance dropdown and persists the selection", async () => {
    render(
      <AppThemeProvider>
        <ThemeToggleButton />
      </AppThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });

    fireEvent.click(screen.getByRole("button", { name: /open appearance settings/i }));
    fireEvent.click(screen.getByRole("button", { name: /light mode/i }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    });
  });

  it("emits acrylic-mode changes from the appearance dropdown", async () => {
    const onAcrylicModeChange = vi.fn();

    render(
      <AppThemeProvider>
        <ThemeToggleButton isAcrylicMode={true} onAcrylicModeChange={onAcrylicModeChange} />
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open appearance settings/i }));
    fireEvent.click(screen.getByRole("button", { name: /toggle acrylic mode/i }));

    expect(onAcrylicModeChange).toHaveBeenCalledWith(false);
  });
});
