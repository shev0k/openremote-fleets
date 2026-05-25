import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";
import { recordOpenRemoteAdapterIssue } from "./openRemoteAdapterStatus";

function warnOpenRemoteRepositoryFallback(message: string, error?: unknown) {
  if (!import.meta.env.DEV) {
    return;
  }

  if (error === undefined) {
    console.warn(message);
    return;
  }

  console.warn(message, error);
}

export abstract class OpenRemoteRepositoryBase {
  protected constructor(protected readonly runtime: OpenRemoteRuntime) {}

  protected async withFallback<T>(operation: string, fallback: T, run: () => Promise<T>) {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      const issue = recordOpenRemoteAdapterIssue({
        source: this.constructor.name,
        operation,
        reason: "runtime-not-ready",
        message: `${operation} skipped because the runtime is not ready yet.`,
      });
      warnOpenRemoteRepositoryFallback(`[OpenRemoteRepository] ${issue.message}`);
      return fallback;
    }

    try {
      return await run();
    } catch (error) {
      const issue = recordOpenRemoteAdapterIssue({
        source: this.constructor.name,
        operation,
        reason: "operation-failed",
        message: `${operation} failed; returning the safe scaffold fallback.`,
        error,
      });
      warnOpenRemoteRepositoryFallback(`[OpenRemoteRepository] ${issue.message}`, error);
      return fallback;
    }
  }

  protected async withVoidFallback(operation: string, run: () => Promise<void>) {
    const ready = await this.runtime.ensureReady({ refreshSession: false });
    if (!ready) {
      const issue = recordOpenRemoteAdapterIssue({
        source: this.constructor.name,
        operation,
        reason: "runtime-not-ready",
        message: `${operation} skipped because the runtime is not ready yet.`,
      });
      warnOpenRemoteRepositoryFallback(`[OpenRemoteRepository] ${issue.message}`);
      return;
    }

    try {
      await run();
    } catch (error) {
      const issue = recordOpenRemoteAdapterIssue({
        source: this.constructor.name,
        operation,
        reason: "operation-failed",
        message: `${operation} failed; keeping the app shell alive with a no-op fallback.`,
        error,
      });
      warnOpenRemoteRepositoryFallback(`[OpenRemoteRepository] ${issue.message}`, error);
    }
  }
}
