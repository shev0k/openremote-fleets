import type { DispatcherAssistanceRequest } from "../dispatcher";

export const MOCK_DISPATCHER_FIXTURES: DispatcherAssistanceRequest[] = [
  {
    id: "dispatch-flag-eindhoven-ring",
    label: "Blocked service van",
    createdAtIso: "2026-03-29T09:20:00Z",
    location: { latitude: 51.4434, longitude: 5.4808 },
    requiredVehicleClasses: ["van"],
    candidates: [
      {
        vehicleId: "veh-harbor-07",
        rank: 1,
        distanceKm: 2.8,
        etaMinutes: 7,
        availability: "available",
        status: "idling",
        activeAlertCount: 1,
        routeSummary: "7 min via Kennedylaan",
        logbookSnippet: "Idling near depot, last stop completed 12 minutes ago.",
      },
      {
        vehicleId: "veh-courier-19",
        rank: 2,
        distanceKm: 5.1,
        etaMinutes: 11,
        availability: "busy",
        status: "moving",
        activeAlertCount: 0,
        routeSummary: "11 min via Fellenoord",
        logbookSnippet: "Moving northbound with one active delivery.",
      },
    ],
  },
];
