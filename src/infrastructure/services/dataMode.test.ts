import { describe, expect, it } from "vitest";
import { resolveDataMode } from "./dataMode";

describe("resolveDataMode", () => {
  it("defaults to openRemote for undefined, empty, and unknown values", () => {
    expect(resolveDataMode()).toBe("openRemote");
    expect(resolveDataMode("")).toBe("openRemote");
    expect(resolveDataMode("staging")).toBe("openRemote");
  });

  it("returns explicit supported modes", () => {
    expect(resolveDataMode("openRemote")).toBe("openRemote");
    expect(resolveDataMode("mock")).toBe("mock");
  });

  it("matches the Vite mock-mode shortcut", () => {
    expect(resolveDataMode(undefined, "mock")).toBe("mock");
    expect(resolveDataMode("openRemote", "mock")).toBe("mock");
  });
});
