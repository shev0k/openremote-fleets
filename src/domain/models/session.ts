export type AppSessionStatus = "idle" | "initializing" | "ready" | "error";

export interface AppSessionSnapshot {
  status: AppSessionStatus;
  authenticated: boolean;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  roles: Record<string, string[]>;
  realm: string | null;
  managerUrl: string | null;
  error: string | null;
}
