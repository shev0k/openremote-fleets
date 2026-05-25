/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePopover } from "./ProfilePopover";

vi.mock("../../providers/session/appSessionContext", () => ({
  useAppSession: () => ({
    session: {
      status: "ready",
      authenticated: true,
      username: "mila",
      displayName: "Mila Janssen",
      firstName: "Mila",
      lastName: "Janssen",
      email: "mila@example.test",
      roles: {},
      realm: "master",
      managerUrl: "https://localhost",
      error: null,
    },
    logout: vi.fn(),
  }),
}));

describe("ProfilePopover", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not expose the removed My Profile option", async () => {
    render(
      <MemoryRouter>
        <ProfilePopover isOpen onToggle={() => undefined} onClose={() => undefined} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Wall Display")).toBeInTheDocument();
    expect(screen.queryByText("My Profile")).not.toBeInTheDocument();
  });

  it("opens Preferences from the profile menu", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProfilePopover isOpen onToggle={() => undefined} onClose={() => undefined} />} />
          <Route path="/preferences" element={<div>Preferences page opened</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /preferences/i }));

    await waitFor(() => expect(screen.getByText("Preferences page opened")).toBeInTheDocument());
  });
});
