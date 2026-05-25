import type { Manager } from "@openremote/core";
import type { ManagerConfig, User } from "@openremote/model";
import type { AppSessionSnapshot, AppSessionStatus } from "../../../domain/models/session";

export type OpenRemoteSessionStatus = AppSessionStatus;
export type OpenRemoteSessionSnapshot = AppSessionSnapshot;

export type OpenRemoteSessionListener = (snapshot: OpenRemoteSessionSnapshot) => void;

function rolesToRecord(roles: Map<string, string[]>) {
  return Object.fromEntries(Array.from(roles.entries()));
}

function toErrorMessage(error?: unknown) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function toOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function resolveDisplayName(user: Partial<User> | undefined, fallbackUsername?: string | null) {
  const firstName = toOptionalText(user?.firstName);
  const lastName = toOptionalText(user?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || toOptionalText(user?.username) || toOptionalText(user?.email) || fallbackUsername || null;
}

export class OpenRemoteSessionService {
  constructor(
    private readonly config: ManagerConfig,
    private readonly getManagerInstance: () => Manager,
  ) {}

  createInitialSnapshot(): OpenRemoteSessionSnapshot {
    return {
      status: "idle",
      authenticated: false,
      username: null,
      displayName: null,
      firstName: null,
      lastName: null,
      email: null,
      roles: {},
      realm: this.config.realm ?? null,
      managerUrl: this.config.managerUrl ?? null,
      error: null,
    };
  }

  async readSnapshot(status: OpenRemoteSessionStatus, error?: unknown): Promise<OpenRemoteSessionSnapshot> {
    const manager = this.getManagerInstance();

    const snapshot: OpenRemoteSessionSnapshot = {
      status,
      authenticated: manager.authenticated,
      username: toOptionalText(manager.username),
      displayName: toOptionalText(manager.username),
      firstName: null,
      lastName: null,
      email: null,
      roles: rolesToRecord(manager.roles),
      realm: manager.getRealm() ?? this.config.realm ?? null,
      managerUrl: manager.managerUrl ?? this.config.managerUrl ?? null,
      error: toErrorMessage(error),
    };

    if (!manager.ready || !manager.authenticated) {
      return snapshot;
    }

    try {
      // This is the first live REST-backed session lookup once Keycloak and manager bootstrap complete.
      const response = await manager.rest.api.UserResource.getCurrent();
      const currentUser = response.data as User | undefined;

      return {
        ...snapshot,
        username: toOptionalText(currentUser?.username) ?? snapshot.username,
        displayName: resolveDisplayName(currentUser, snapshot.username),
        firstName: toOptionalText(currentUser?.firstName),
        lastName: toOptionalText(currentUser?.lastName),
        email: toOptionalText(currentUser?.email),
      };
    } catch (currentUserError) {
      return {
        ...snapshot,
        error: snapshot.error ?? toErrorMessage(currentUserError),
      };
    }
  }
}
