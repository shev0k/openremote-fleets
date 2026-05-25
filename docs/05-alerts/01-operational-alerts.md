# 05. Alerts

The Alerts page is for operations work.

It shows fleet alarms, tracker context, and current alert state. It is not a rule configuration surface.

## What The Page Supports

- filter by vehicle, severity, state, type, date range, and search text
- acknowledge active alerts
- resolve active or acknowledged alerts
- focus the linked vehicle
- read source attribute and source value context when available
- share alert state with Live Fleet surfaces

## OpenRemote Boundary

Alert rules stay in OpenRemote Manager.

Fleets should not add:

- rule creation
- rule editing
- rule pausing
- Manager configuration menus

It is fine to show rule names, source attributes, and source values as read-only operational context.

## Data Contract

Alert data uses:

- `src/domain/models/alerts.ts`
- `src/domain/repositories/alertsRepository.ts`

Optional fields such as `sourceAttribute`, `sourceValue`, and `speedKph` should improve context when present, but the UI must stay useful when they are missing.

## Main Files

- `src/app/pages/Alerts.tsx`
  Route page.
- `src/app/features/alerts/alertFilters.ts`
  Shared filter logic.
- `src/app/contexts/AlertsContext.tsx`
  Loads alerts, exposes active counts, refreshes, and performs optimistic state updates.
- `src/app/features/live-fleet/components/AlertStateActionButton.tsx`
  Compact acknowledge/resolve action used by Live Fleet.
- `src/app/features/live-fleet/liveFleetAlertViewModel.ts`
  Projects alert rows onto vehicles and gates future mock alerts by simulated route progress.
- `src/app/features/live-fleet/routeAlarmMarkers.ts`
  Places route alarm markers by alert timestamps.

## Real Mode

Real mode:

- reads alarms with `AlarmResource.getAlarms()`
- maps `SentAlarm` into `FleetAlert`
- maps OpenRemote severity into `high`, `medium`, or `low`
- maps OpenRemote state into active, acknowledged, or resolved
- includes linked vehicle and source context when Manager data contains it
- calls `AlarmResource.getAlarm(id)` and `AlarmResource.updateAlarm(id, alarm)` for state changes when possible
- keeps state updates app-safe if Manager is not ready or a single alert cannot be loaded

The UI updates optimistically. Broader real-time refresh from other users or integrations is still polling-based until websocket alarm updates are wired.

## Mock Mode

Mock mode uses:

- `src/infrastructure/repositories/mock/fixtures/alertsFixtures.ts`
- `src/infrastructure/repositories/mock/mockAlertsRepository.ts`

Future-dated demo alerts are held back in Live Fleet until the route-backed mock vehicle reaches their timestamp. This keeps mock alerting aligned with simulated vehicle state.

## Rules

- Keep acknowledge and resolve actions behind `AlertsRepository.updateAlertState(...)`.
- Do not add local-only alert state in Live Fleet.
- Do not make Fleets create OpenRemote alarms or rules.
- Keep alert source context optional.
- Keep mapping in infrastructure repositories, not page components.
