import type { AppServices } from "../../domain/services/appServices";
import { createMockAppServices } from "./createMockAppServices";

export function createModeAppServices(): AppServices {
  return createMockAppServices();
}
