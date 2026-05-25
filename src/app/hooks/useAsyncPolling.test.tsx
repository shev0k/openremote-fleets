/* @vitest-environment jsdom */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsyncPolling } from "./useAsyncPolling";

function PollingHarness({
  callback,
  enabled = true,
  intervalMs = 1_000,
  onError,
}: {
  callback: () => Promise<void> | void;
  enabled?: boolean;
  intervalMs?: number;
  onError?: (error: unknown) => void;
}) {
  useAsyncPolling(callback, intervalMs, { enabled, onError });
  return null;
}

describe("useAsyncPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("runs the callback on the configured interval", () => {
    const callback = vi.fn();
    render(<PollingHarness callback={callback} intervalMs={1_000} />);

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not start when disabled", () => {
    const callback = vi.fn();
    render(<PollingHarness callback={callback} intervalMs={1_000} enabled={false} />);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("skips overlapping async runs", async () => {
    let resolveCurrentRun: () => void = () => undefined;
    const callback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCurrentRun = resolve;
        }),
    );
    render(<PollingHarness callback={callback} intervalMs={1_000} />);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCurrentRun();
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("reports callback errors without stopping future intervals", async () => {
    const error = new Error("poll failed");
    const onError = vi.fn();
    const callback = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    render(<PollingHarness callback={callback} intervalMs={1_000} onError={onError} />);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });
    expect(onError).toHaveBeenCalledWith(error);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
