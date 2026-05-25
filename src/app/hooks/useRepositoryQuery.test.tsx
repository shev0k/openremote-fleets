/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRepositoryQuery } from "./useRepositoryQuery";

describe("useRepositoryQuery", () => {
  it("loads data and exposes explicit loading and error state", async () => {
    const query = vi.fn().mockResolvedValue(["vehicle-1"]);

    const { result } = renderHook(() =>
      useRepositoryQuery({
        initialData: [] as string[],
        query,
      }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.data).toEqual(["vehicle-1"]));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("ignores stale responses from older requests", async () => {
    let resolveFirst: (value: string[]) => void = () => undefined;
    let resolveSecond: (value: string[]) => void = () => undefined;
    const query = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string[]>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<string[]>((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(() =>
      useRepositoryQuery({
        initialData: [] as string[],
        query,
      }),
    );

    await act(async () => {
      const refreshPromise = result.current.refresh();
      resolveSecond(["new"]);
      await refreshPromise;
    });

    await act(async () => {
      resolveFirst(["stale"]);
    });

    await waitFor(() => expect(result.current.data).toEqual(["new"]));
  });

  it("keeps previous data when refresh fails", async () => {
    const query = vi.fn().mockResolvedValueOnce(["initial"]).mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() =>
      useRepositoryQuery({
        initialData: [] as string[],
        query,
      }),
    );

    await waitFor(() => expect(result.current.data).toEqual(["initial"]));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(["initial"]);
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
