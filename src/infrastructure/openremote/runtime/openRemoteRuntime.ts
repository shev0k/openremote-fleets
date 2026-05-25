import openRemoteManager, {
  OREvent,
  type LoginOptions,
  type Manager,
} from "@openremote/core";
import type { ManagerConfig } from "@openremote/model";
import { resolveOpenRemoteConfig } from "./openRemoteConfig";
import {
  OpenRemoteSessionService,
  type OpenRemoteSessionListener,
  type OpenRemoteSessionSnapshot,
  type OpenRemoteSessionStatus,
} from "./openRemoteSessionService";

export type OpenRemoteApi = Manager["rest"]["api"];

export interface OpenRemoteEnsureReadyOptions {
  refreshSession?: boolean;
}

type ConsoleInitSuppressibleManager = Manager & {
  doConsoleInit?: () => Promise<boolean>;
  __fleetConsoleInitSuppressed?: boolean;
};

function suppressStandaloneConsoleInit(managerInstance: Manager) {
  const suppressibleManager = managerInstance as ConsoleInitSuppressibleManager;
  if (suppressibleManager.__fleetConsoleInitSuppressed || typeof suppressibleManager.doConsoleInit !== "function") {
    return;
  }

  // The standalone fleets app does not use OpenRemote console registration/providers.
  // Leaving the SDK console bootstrap on causes noisy /console/register 403s for normal web sessions.
  suppressibleManager.doConsoleInit = async () => true;
  suppressibleManager.__fleetConsoleInitSuppressed = true;
}

export class OpenRemoteRuntime {
  private readonly sessionService: OpenRemoteSessionService;
  private readonly listeners = new Set<OpenRemoteSessionListener>();
  private readonly managerEventListener = (event: OREvent) => {
    void this.handleManagerEvent(event);
  };

  private initPromise: Promise<boolean> | null = null;
  private status: OpenRemoteSessionStatus = "idle";
  private snapshot: OpenRemoteSessionSnapshot;

  constructor(
    private readonly managerInstance: Manager = openRemoteManager,
    private readonly config: ManagerConfig = resolveOpenRemoteConfig(),
  ) {
    suppressStandaloneConsoleInit(this.managerInstance);
    this.sessionService = new OpenRemoteSessionService(this.config, () => this.managerInstance);
    this.snapshot = this.sessionService.createInitialSnapshot();
    this.managerInstance.addListener(this.managerEventListener);
  }

  getConfig() {
    return this.config;
  }

  getManager() {
    return this.managerInstance;
  }

  getApi(): OpenRemoteApi {
    return this.managerInstance.rest.api;
  }

  getAccessToken() {
    return this.managerInstance.getKeycloakToken();
  }

  getSessionSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: OpenRemoteSessionListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async ensureReady(options: OpenRemoteEnsureReadyOptions = {}) {
    const refreshSession = options.refreshSession ?? true;

    if (this.managerInstance.ready) {
      this.status = "ready";
      if (refreshSession) {
        await this.refreshSessionSnapshot();
      }
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.status = "initializing";
    this.publishSnapshot({
      ...this.snapshot,
      status: this.status,
      error: null,
    });

    this.initPromise = this.managerInstance
      .init(this.config)
      .then(async (success) => {
        this.status = success ? "ready" : "error";
        await this.refreshSessionSnapshot(success ? undefined : this.managerInstance.error);
        return success;
      })
      .catch(async (error) => {
        this.status = "error";
        await this.refreshSessionSnapshot(error);
        return false;
      })
      .finally(() => {
        this.initPromise = null;
      });

    return this.initPromise;
  }

  login(options?: LoginOptions) {
    this.managerInstance.login(options);
    void this.refreshSessionSnapshot();
  }

  logout(redirectUrl?: string) {
    this.status = "idle";
    this.publishSnapshot(this.sessionService.createInitialSnapshot());
    this.managerInstance.logout(redirectUrl);
  }

  async refreshSessionSnapshot(error?: unknown) {
    const snapshot = await this.sessionService.readSnapshot(this.status, error);
    this.publishSnapshot(snapshot);
    return snapshot;
  }

  private async handleManagerEvent(event: OREvent) {
    switch (event) {
      case OREvent.READY:
      case OREvent.ONLINE:
        this.status = "ready";
        break;
      case OREvent.ERROR:
        this.status = "error";
        break;
      case OREvent.CONNECTING:
        if (this.status !== "ready") {
          this.status = "initializing";
        }
        break;
      default:
        break;
    }

    await this.refreshSessionSnapshot(this.managerInstance.error);
  }

  private publishSnapshot(snapshot: OpenRemoteSessionSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
