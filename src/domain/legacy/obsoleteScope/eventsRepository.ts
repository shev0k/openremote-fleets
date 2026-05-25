import { PlaybackQuery } from "../../models/playback";
import { DailyActivitySummary, FleetEvent } from "./events";

export interface EventsRepository {
  listEvents(query: PlaybackQuery, vehicleId?: string): Promise<FleetEvent[]>;
  getDailyActivitySummary(vehicleId: string, dateIso: string): Promise<DailyActivitySummary | null>;
}
