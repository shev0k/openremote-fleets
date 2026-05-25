import type { AppServices } from "../../domain/services/appServices";
import { createOpenRemoteAppServices } from "./createOpenRemoteAppServices";

export function createModeAppServices(): AppServices {
  return createOpenRemoteAppServices();
}
