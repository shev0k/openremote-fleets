import { OpenRemoteRuntime } from "./openRemoteRuntime";

let defaultOpenRemoteRuntime: OpenRemoteRuntime | null = null;

export function getOpenRemoteRuntime() {
  if (!defaultOpenRemoteRuntime) {
    defaultOpenRemoteRuntime = new OpenRemoteRuntime();
  }

  return defaultOpenRemoteRuntime;
}

export function resetOpenRemoteRuntimeForTests() {
  defaultOpenRemoteRuntime = null;
}
