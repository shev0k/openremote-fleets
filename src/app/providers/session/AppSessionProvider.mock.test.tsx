/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MockAppSessionProvider } from "./AppSessionProvider.mock";
import { useAppSession } from "./appSessionContext";

function SessionProbe() {
  const { session } = useAppSession();

  return (
    <div>
      <span data-testid="status">{session.status}</span>
      <span data-testid="authenticated">{String(session.authenticated)}</span>
      <span data-testid="realm">{session.realm ?? "none"}</span>
      <span data-testid="manager-url">{session.managerUrl ?? "none"}</span>
    </div>
  );
}

describe("MockAppSessionProvider", () => {
  it("provides a local inert session without OpenRemote manager state", () => {
    render(
      <MockAppSessionProvider>
        <SessionProbe />
      </MockAppSessionProvider>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("realm")).toHaveTextContent("mock");
    expect(screen.getByTestId("manager-url")).toHaveTextContent("none");
  });
});
