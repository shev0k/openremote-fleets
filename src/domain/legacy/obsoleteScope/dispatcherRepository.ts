import { DispatcherAssistanceRequest, DispatcherMapFlag } from "./dispatcher";

export interface DispatcherRepository {
  createAssistanceRequest(flag: DispatcherMapFlag): Promise<DispatcherAssistanceRequest>;
  getAssistanceRequest(requestId: string): Promise<DispatcherAssistanceRequest | null>;
}
