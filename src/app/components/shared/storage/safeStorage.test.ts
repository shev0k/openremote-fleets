import { describe, expect, it } from "vitest";
import { parseStoredJson } from "./safeStorage";

describe("safeStorage", () => {
  it("parses stored JSON as unknown and accepts it only when the shape guard passes", () => {
    const result = parseStoredJson('{"visible":true}', (value): value is { visible: boolean } => {
      return value !== null && typeof value === "object" && !Array.isArray(value) && "visible" in value;
    });

    expect(result).toEqual({ visible: true });
  });

  it("returns null for malformed JSON or rejected shapes", () => {
    const isPlainObject = (value: unknown): value is Record<string, unknown> => {
      return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    };

    expect(parseStoredJson("{", isPlainObject)).toBeNull();
    expect(parseStoredJson("[1,2,3]", isPlainObject)).toBeNull();
    expect(parseStoredJson("null", isPlainObject)).toBeNull();
  });
});
