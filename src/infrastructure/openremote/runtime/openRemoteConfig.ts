import { OPENREMOTE_CLIENT_ID } from "@openremote/core";
import type { ManagerConfig } from "@openremote/model";

const DEFAULT_OPENREMOTE_MANAGER_URL = "https://localhost";
const DEFAULT_OPENREMOTE_REALM = "master";

export interface OpenRemoteEnv {
  VITE_OR_MANAGER_URL?: string;
  VITE_OR_KEYCLOAK_URL?: string;
  VITE_OR_REALM?: string;
  VITE_OR_CLIENT_ID?: string;
}

function normalizeUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/\/+$/, "");
}

function resolveLocalDevProxyManagerUrl() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return undefined;
  }

  const isLocalHttpsDevServer =
    window.location.protocol === "https:" &&
    window.location.hostname === "localhost" &&
    window.location.port === "5173";

  return isLocalHttpsDevServer ? normalizeUrl(window.location.origin) : undefined;
}

export function resolveOpenRemoteConfig(env: OpenRemoteEnv = import.meta.env): ManagerConfig {
  const explicitManagerUrl = normalizeUrl(env.VITE_OR_MANAGER_URL);
  const explicitKeycloakUrl = normalizeUrl(env.VITE_OR_KEYCLOAK_URL);
  const localDevProxyManagerUrl = resolveLocalDevProxyManagerUrl();
  const localDockerKeycloakUrl = `${DEFAULT_OPENREMOTE_MANAGER_URL}/auth`;
  const useLocalDevProxy =
    !!localDevProxyManagerUrl &&
    (!explicitManagerUrl || explicitManagerUrl === DEFAULT_OPENREMOTE_MANAGER_URL) &&
    (!explicitKeycloakUrl || explicitKeycloakUrl === localDockerKeycloakUrl);

  const managerUrl =
    (useLocalDevProxy ? localDevProxyManagerUrl : undefined) ??
    explicitManagerUrl ??
    DEFAULT_OPENREMOTE_MANAGER_URL;
  const keycloakUrl =
    (useLocalDevProxy ? `${managerUrl}/auth` : undefined) ??
    explicitKeycloakUrl ??
    `${managerUrl}/auth`;
  const realm = env.VITE_OR_REALM?.trim() || DEFAULT_OPENREMOTE_REALM;
  const clientId = env.VITE_OR_CLIENT_ID?.trim() || OPENREMOTE_CLIENT_ID;

  return {
    managerUrl,
    keycloakUrl,
    realm,
    clientId,
    auth: "KEYCLOAK" as ManagerConfig["auth"],
    autoLogin: true,
    consoleAutoEnable: false,
    skipFallbackToBasicAuth: true,
  };
}
