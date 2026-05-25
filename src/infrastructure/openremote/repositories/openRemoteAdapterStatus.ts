export type OpenRemoteAdapterIssueReason = "runtime-not-ready" | "operation-failed";

export interface OpenRemoteAdapterIssue {
  id: string;
  source: string;
  operation: string;
  reason: OpenRemoteAdapterIssueReason;
  message: string;
  errorMessage: string | null;
  occurredAt: string;
}

const MAX_RECORDED_ISSUES = 50;
const adapterIssues: OpenRemoteAdapterIssue[] = [];

export function recordOpenRemoteAdapterIssue(
  issue: Omit<OpenRemoteAdapterIssue, "id" | "occurredAt" | "errorMessage"> & { error?: unknown },
) {
  const occurredAt = new Date().toISOString();
  const recordedIssue: OpenRemoteAdapterIssue = {
    id: `${occurredAt}:${issue.source}:${issue.operation}:${issue.reason}`,
    source: issue.source,
    operation: issue.operation,
    reason: issue.reason,
    message: issue.message,
    errorMessage: issue.error === undefined ? null : getErrorMessage(issue.error),
    occurredAt,
  };

  adapterIssues.unshift(recordedIssue);
  adapterIssues.splice(MAX_RECORDED_ISSUES);
  return recordedIssue;
}

export function getOpenRemoteAdapterIssues() {
  return [...adapterIssues];
}

export function clearOpenRemoteAdapterIssues() {
  adapterIssues.length = 0;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
