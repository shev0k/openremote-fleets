import { describe, expect, it } from "vitest";
import type { AppSessionSnapshot } from "../../../domain/models/session";
import { getProfileIdentity } from "./profileIdentity";

function createSessionSnapshot(overrides: Partial<AppSessionSnapshot> = {}): AppSessionSnapshot {
  return {
    status: "ready",
    authenticated: true,
    username: "fleet.operator",
    displayName: "Fleet Operator",
    firstName: "Fleet",
    lastName: "Operator",
    email: "fleet.operator@example.com",
    roles: {},
    realm: "master",
    managerUrl: "https://localhost:5173",
    error: null,
    ...overrides,
  };
}

describe("getProfileIdentity", () => {
  it("prefers display name and email when available", () => {
    expect(getProfileIdentity(createSessionSnapshot())).toEqual({
      displayName: "Fleet Operator",
      secondaryLabel: "fleet.operator@example.com",
      initials: "FO",
    });
  });

  it("falls back to username-derived initials when profile fields are not available", () => {
    expect(
      getProfileIdentity(
        createSessionSnapshot({
          displayName: null,
          firstName: null,
          lastName: null,
          email: null,
          username: "john.doe",
        }),
      ),
    ).toEqual({
      displayName: "john.doe",
      secondaryLabel: "OpenRemote account",
      initials: "JD",
    });
  });
});
