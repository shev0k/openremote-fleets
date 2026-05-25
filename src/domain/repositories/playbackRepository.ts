import { PlaybackQuery, PlaybackRoute } from "../models/playback";
import { TelemetryTimeline } from "../models/telemetry";
import { Vehicle } from "../models/vehicle";

export interface PlaybackRepository {
  listPlaybackVehicles(): Promise<Vehicle[]>;
  getPlaybackRoute(vehicleId: string, query: PlaybackQuery): Promise<PlaybackRoute | null>;
  getPlaybackTelemetryTimeline(vehicleId: string, query: PlaybackQuery, signalIds?: string[]): Promise<TelemetryTimeline | null>;
}
