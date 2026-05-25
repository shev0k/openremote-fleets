import { describe, expect, it } from "vitest";

describe("OpenRemote current-user lookup ownership", () => {
  it("keeps current-user lookup owned by the runtime session service only", () => {
    const duplicateSessionServices = import.meta.glob("./OpenRemoteUserSessionService.ts");

    expect(Object.keys(duplicateSessionServices)).toEqual([]);
  });
});
