/* @vitest-environment jsdom */

import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppSessionSnapshot } from "../../../domain/models/session";
import type { OpenRemoteRuntime } from "../../../infrastructure/openremote/runtime/openRemoteRuntime";
import { OpenRemoteAppSessionProvider } from "./AppSessionProvider.openRemote";

const initialSession: AppSessionSnapshot = {
  status: "idle",
  authenticated: false,
  username: null,
  displayName: null,
  firstName: null,
  lastName: null,
  email: null,
  roles: {},
  realm: "master",
  managerUrl: "https://localhost",
  error: null,
};

function createRuntimeMock() {
  return {
    getSessionSnapshot: vi.fn(() => initialSession),
    subscribe: vi.fn(() => vi.fn()),
    ensureReady: vi.fn(),
    logout: vi.fn(),
  } as unknown as OpenRemoteRuntime;
}

describe("OpenRemoteAppSessionProvider", () => {
  afterEach(() => {
    delete window.__OPENREMOTE_FLEETS_ADAPTER_ISSUES__;
  });

  it("boots the OpenRemote runtime when mounted", async () => {
    const runtime = createRuntimeMock();

    render(
      <OpenRemoteAppSessionProvider runtime={runtime}>
        <div>child</div>
      </OpenRemoteAppSessionProvider>,
    );

    await waitFor(() => {
      expect(runtime.ensureReady).toHaveBeenCalledTimes(1);
    });
    expect(runtime.ensureReady).toHaveBeenCalledWith();
  });

  it("exposes adapter diagnostics in development real mode", async () => {
    const runtime = createRuntimeMock();
    const { unmount } = render(
      <OpenRemoteAppSessionProvider runtime={runtime}>
        <div>child</div>
      </OpenRemoteAppSessionProvider>,
    );

    await waitFor(() => {
      expect(window.__OPENREMOTE_FLEETS_ADAPTER_ISSUES__).toEqual(expect.any(Function));
    });

    unmount();
    expect(window.__OPENREMOTE_FLEETS_ADAPTER_ISSUES__).toBeUndefined();
  });
});
