export type DataMode = "openRemote" | "mock";

export const APP_DATA_MODE: DataMode = __OPENREMOTE_FLEETS_DATA_MODE__;

export function resolveDataMode(requestedMode?: string, viteMode = ""): DataMode {
  return viteMode === "mock" || requestedMode === "mock" ? "mock" : "openRemote";
}
