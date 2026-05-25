import { useEffect, useRef } from "react";

interface UseAsyncPollingOptions {
  enabled?: boolean;
  onError?: (error: unknown) => void;
}

export function useAsyncPolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  { enabled = true, onError }: UseAsyncPollingOptions = {},
) {
  const callbackRef = useRef(callback);
  const onErrorRef = useRef(onError);
  const isRunningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0 || typeof window === "undefined") {
      return undefined;
    }

    const run = () => {
      if (isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;
      Promise.resolve(callbackRef.current())
        .catch((error: unknown) => {
          onErrorRef.current?.(error);
        })
        .finally(() => {
          isRunningRef.current = false;
        });
    };

    const timerId = window.setInterval(run, intervalMs);
    return () => window.clearInterval(timerId);
  }, [enabled, intervalMs]);
}
