import openRemoteManager from "@openremote/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenRemoteRuntime } from "./openRemoteRuntime";

vi.mock("@openremote/core", () => {
  const manager = {
    ready: false,
    authenticated: false,
    username: "",
    roles: new Map<string, string[]>(),
    managerUrl: "https://localhost",
    error: undefined as unknown,
    rest: {
      api: {
        UserResource: {
          getCurrent: vi.fn(),
        },
      },
    },
    addListener: vi.fn(),
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getKeycloakToken: vi.fn(() => "test-token"),
    getRealm: vi.fn(() => "master"),
  };

  return {
    __esModule: true,
    default: manager,
    OPENREMOTE_CLIENT_ID: "openremote",
    OREvent: {
      READY: "READY",
      ONLINE: "ONLINE",
      ERROR: "ERROR",
      CONNECTING: "CONNECTING",
    },
  };
});

type MockedManager = {
  ready: boolean;
  authenticated: boolean;
  username: string;
  roles: Map<string, string[]>;
  managerUrl: string;
  error: unknown;
  rest: {
    api: {
      UserResource: {
        getCurrent: ReturnType<typeof vi.fn>;
      };
    };
  };
  addListener: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  getKeycloakToken: ReturnType<typeof vi.fn>;
  getRealm: ReturnType<typeof vi.fn>;
};

const managerMock = openRemoteManager as unknown as MockedManager;

describe("OpenRemoteRuntime", () => {
  beforeEach(() => {
    managerMock.ready = false;
    managerMock.authenticated = false;
    managerMock.username = "";
    managerMock.roles = new Map([["openremote", ["read"]]]);
    managerMock.managerUrl = "https://localhost";
    managerMock.error = undefined;
    managerMock.addListener.mockReset();
    managerMock.init.mockReset();
    managerMock.login.mockReset();
    managerMock.logout.mockReset();
    managerMock.getKeycloakToken.mockReturnValue("test-token");
    managerMock.getRealm.mockReturnValue("master");
    managerMock.rest.api.UserResource.getCurrent.mockReset();
    managerMock.rest.api.UserResource.getCurrent.mockResolvedValue({
      data: {
        username: "fleet-user",
        firstName: "Fleet",
        lastName: "Operator",
        email: "fleet.operator@example.com",
      },
    });
  });

  it("single-flights manager bootstrap and publishes a ready session snapshot", async () => {
    managerMock.init.mockImplementation(async () => {
      managerMock.ready = true;
      managerMock.authenticated = true;
      managerMock.username = "sdk-user";
      return true;
    });

    const runtime = new OpenRemoteRuntime(managerMock as never, {
      managerUrl: "https://localhost",
      keycloakUrl: "https://localhost/auth",
      realm: "master",
      clientId: "openremote",
      auth: "KEYCLOAK" as import("@openremote/model").ManagerConfig["auth"],
      autoLogin: true,
      consoleAutoEnable: false,
      skipFallbackToBasicAuth: true,
    });

    const [first, second] = await Promise.all([runtime.ensureReady(), runtime.ensureReady()]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(managerMock.init).toHaveBeenCalledTimes(1);
    expect(managerMock.init).toHaveBeenCalledWith(
      expect.objectContaining({
        managerUrl: "https://localhost",
        keycloakUrl: "https://localhost/auth",
        realm: "master",
        clientId: "openremote",
        auth: "KEYCLOAK",
        autoLogin: true,
        consoleAutoEnable: false,
        skipFallbackToBasicAuth: true,
      }),
    );
    expect(runtime.getSessionSnapshot()).toMatchObject({
      status: "ready",
      authenticated: true,
      username: "fleet-user",
      displayName: "Fleet Operator",
      email: "fleet.operator@example.com",
      managerUrl: "https://localhost",
      realm: "master",
      roles: {
        openremote: ["read"],
      },
    });
  });

  it("publishes an error snapshot when manager bootstrap fails", async () => {
    managerMock.init.mockResolvedValue(false);
    managerMock.error = "AUTH_FAILED";

    const runtime = new OpenRemoteRuntime(managerMock as never, {
      managerUrl: "https://localhost",
      keycloakUrl: "https://localhost/auth",
      realm: "master",
      clientId: "openremote",
      auth: "KEYCLOAK" as import("@openremote/model").ManagerConfig["auth"],
      autoLogin: true,
      consoleAutoEnable: false,
      skipFallbackToBasicAuth: true,
    });

    await expect(runtime.ensureReady()).resolves.toBe(false);
    expect(runtime.getSessionSnapshot()).toMatchObject({
      status: "error",
      authenticated: false,
      error: "AUTH_FAILED",
    });
  });

  it("does not refresh the user session snapshot on lightweight ready data reads", async () => {
    managerMock.ready = true;
    managerMock.authenticated = true;
    managerMock.username = "sdk-user";

    const runtime = new OpenRemoteRuntime(managerMock as never, {
      managerUrl: "https://localhost",
      keycloakUrl: "https://localhost/auth",
      realm: "master",
      clientId: "openremote",
      auth: "KEYCLOAK" as import("@openremote/model").ManagerConfig["auth"],
      autoLogin: true,
      consoleAutoEnable: false,
      skipFallbackToBasicAuth: true,
    });

    await runtime.ensureReady();
    await runtime.ensureReady({ refreshSession: false });
    await runtime.ensureReady({ refreshSession: false });

    expect(managerMock.rest.api.UserResource.getCurrent).toHaveBeenCalledTimes(1);
  });

  it("clears the local session snapshot before handing off logout to the SDK", () => {
    const runtime = new OpenRemoteRuntime(managerMock as never, {
      managerUrl: "https://localhost",
      keycloakUrl: "https://localhost/auth",
      realm: "master",
      clientId: "openremote",
      auth: "KEYCLOAK" as import("@openremote/model").ManagerConfig["auth"],
      autoLogin: true,
      consoleAutoEnable: false,
      skipFallbackToBasicAuth: true,
    });

    runtime.logout("https://localhost:5173/");

    expect(managerMock.logout).toHaveBeenCalledWith("https://localhost:5173/");
    expect(runtime.getSessionSnapshot()).toMatchObject({
      status: "idle",
      authenticated: false,
      username: null,
      displayName: null,
      email: null,
    });
  });
});
