import type { AppServices } from "../../domain/services/appServices";
import { createModeAppServices } from "#app-service-factory";

export function createDefaultAppServices(): AppServices {
  return createModeAppServices();
}
