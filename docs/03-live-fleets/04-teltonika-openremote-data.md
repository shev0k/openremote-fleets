# 04. Teltonika And OpenRemote Data

This is the tracker data handoff. Use it before changing vehicle telemetry, mock fixtures, playback routes, report parameters, or the emulator.

## Source Material

Use these as reference when you need deeper Teltonika or Manager behavior:

- `openremote-manager/agent/src/main/java/org/openremote/agent/protocol/teltonika/`
- `openremote-manager/model/src/main/java/org/openremote/model/telematics/teltonika/`
- `openremote-manager/manager/src/main/java/org/openremote/manager/telematics/`
- `openremote-manager/test/src/test/groovy/org/openremote/test/protocol/mqtt/TeltonikaMQTTClientProtocolTest.groovy`
- Teltonika FMC003 data sending parameter docs

`openremote-manager/` is read-only.

## Manager Shape

OpenRemote Manager supports Teltonika TCP, UDP, and MQTT paths.

Important Manager facts:

- tracker assets use type `TeltonikaTrackerAsset`
- devices are identified by IMEI
- TCP protocol id is `teltonika:tcp:avl`
- UDP protocol id is `teltonika:udp:avl`
- MQTT JSON protocol id is `teltonika:mqtt:json`
- decoded Teltonika records become OpenRemote attributes
- unknown Teltonika IDs are preserved as deterministic `teltonika_<id>` attributes

Fleets maps Manager assets and datapoints into app domain models. UI code should consume those domain models, not raw Manager assets.

## Selected Attribute Map

Mock mode and real mappers should stay aligned to this selected subset.

| Fleets use | OpenRemote attribute | Teltonika id | Unit |
| --- | --- | --- | --- |
| frame priority | `priority` | `pr` | |
| speed | `speed` | `24` | `km/h` |
| ignition | `ignition` | `239` | |
| movement | `movement` | `240` | |
| trip state | `trip` | `250` | |
| map position | `gpsLocation` | `latlng` | |
| altitude | `altitude` | `alt` | `m` |
| heading | `direction` | `ang` | `deg` |
| satellites | `satellites` | `sat` | |
| event id | `eventTriggered` | `evt` | |
| GSM signal | `gsmSignal` | `21` | |
| external power | `externalVoltage` | `66` | `V` |
| battery voltage | `batteryVoltage` | `67` | `V` |
| battery current | `batteryCurrent` | `68` | `A` |
| battery level | `batteryLevel` | `113` | `%` |
| GNSS status | `gnssStatus` | `69` | |
| GNSS HDOP | `gnssHdop` | `182` | |
| total odometer | `totalOdometer` | `16` | `m` |
| trip odometer | `tripOdometer` | `199` | `m` |
| GPS fuel used | `fuelUsedGps` | `12` | `l` |
| GPS fuel rate | `fuelRateGps` | `13` | `l/100km` |
| fuel level | `fuelLevel` | `48` | `%` |
| sleep mode | `sleepMode` | `200` | |
| data mode | `dataMode` | `80` | |
| engine RPM | `engineRpm` | `36` | `rpm` |
| driver/device id | `iButton` | `78` | |

The shared catalog lives in:

- `src/domain/models/teltonikaCatalog.ts`

Mock fixtures and real mappers should import that catalog instead of defining their own attribute lists.

## Real Mode Mapping

Real mode starts from `TeltonikaTrackerAsset` assets:

- `AssetResource.queryAssets({ recursive: true, types: ["TeltonikaTrackerAsset"] })`
- `AssetResource.get(assetId)` for detail/current attributes
- `AssetDatapointResource.getDatapoints(...)` for playback, telemetry timelines, and graph/report history inputs

Main mapper files:

- `src/infrastructure/openremote/repositories/openRemoteVehicleMapper.ts`
- `src/infrastructure/openremote/repositories/openRemotePlaybackMapper.ts`
- `src/infrastructure/openremote/repositories/openRemoteTelemetryMapper.ts`
- `src/infrastructure/openremote/repositories/openRemoteReportMapper.ts`
- `src/infrastructure/openremote/repositories/openRemoteAlertMapper.ts`

Real mapping rules:

- `gpsLocation` is preferred for tracker position
- base Manager `location` can be used as fallback
- missing GPS should set `hasLocation=false`, not fake `0,0`
- missing telemetry should stay missing
- driver name can come from custom Manager metadata
- `iButton` is a driver identifier, not automatically a human-readable driver name
- `plate` and `assetClass` are optional custom attributes
- partial Manager assets should still map to safe app objects

## Route History Rules

Playback presets are translated into date windows:

- `today`: local day start to now
- `yesterday`: previous local day
- `last7Days`: rolling seven days to now
- `last24Hours`: rolling 24 hours to now
- `customDate`: selected local calendar day

Fleets sends epoch milliseconds to Manager, but presets are computed from the user's local browser day. This keeps local emulator data from being split unexpectedly by UTC midnight.

Trip segmentation prefers Teltonika `trip`:

- `trip=true` starts or continues a trip
- `trip=false` ends the current trip
- `true -> false -> true` creates separate trips

If `trip` is missing, Fleets falls back to movement evidence:

- speed above `5 km/h`
- `movement=true`
- displacement over `25m`
- stationary for `10min` can end a fallback trip
- ignition off or long offline gaps can split the route

Route markers are Fleets policy, not native Teltonika facts:

- stop
- idling
- driver break
- engine off
- offline gap
- degraded signal
- alarm

Manager remains the owner of alarms and rules. Fleets should not create OpenRemote alarms from telemetry alone.

## Mock Fixture Rules

Mock mode should be realistic enough that the UI can move to real Manager data without changing component contracts.

Rules:

- use `Teltonika FMC003` as the mock device type
- use a 15-digit IMEI as `trackerId`
- keep `vehicle.teltonika.imei` equal to `vehicle.trackerId`
- derive `speedKph` from `speed`
- derive `ignitionOn` from `ignition`
- derive fuel, battery, mileage, and odometer from Teltonika/OpenRemote attributes
- keep `driverIdentifier` derived from `iButton` when present
- keep routes on realistic road-following coordinates
- keep current route segments connected as one journey
- rebase mock dates at repository read time
- keep base mock repositories deterministic
- keep live movement in `mockLiveFleetSimulation.ts`
- do not invent tracker attributes outside Manager/Teltonika behavior

Main mock files:

- `src/infrastructure/repositories/mock/fixtures/fleetFixtures.ts`
- `src/infrastructure/repositories/mock/fixtures/teltonikaTelemetryFixtures.ts`
- `src/infrastructure/repositories/mock/fixtures/playbackFixtures.ts`
- `src/infrastructure/repositories/mock/fixtures/reportsFixtures.ts`
- `src/infrastructure/repositories/mock/fixtures/alertsFixtures.ts`
- `src/infrastructure/repositories/mock/fixtures/assetsFixtures.ts`
- `src/infrastructure/repositories/mock/mockLiveFleetSimulation.ts`
- `src/infrastructure/repositories/mock/mockPlaybackRepository.ts`
- `src/infrastructure/repositories/mock/mockReportsRepository.ts`

## Timeline Signals

Playback timeline and segment graph rows use `TelemetrySignalSample`.

Supported useful signal ids include:

- `ignition`
- `movement`
- `trip`
- `alarm`
- `speed`
- `fuelLevel`
- `batteryLevel`
- `engineRpm`
- `gnssHdop`

Treat every signal as optional. Real customer assets may only expose part of the catalog.

## Local Emulator

The local emulator lives in:

- `teltonika-emulator/`

It simulates Teltonika FMC003 trackers so the real OpenRemote path can be tested without hardware.

The emulator runbook lives in `teltonika-emulator/README.md`. Lower-level Codec 8, MQTT, and Manager sync notes live in `teltonika-emulator/docs/01-protocol-and-manager-notes.md`.

Start it from `teltonika-emulator/`:

```powershell
.\run.ps1
```

or:

```bash
python3 run.py
```

The emulator:

- identifies trackers by 15-digit IMEI
- sends Codec 8 over TCP or MQTT JSON payloads accepted by Manager
- emits the selected attributes above
- can include or omit Teltonika `trip` AVL `250`
- can rename auto-created Manager assets to configured tracker names
- can add optional text metadata such as `driverName`, `plate`, and `assetClass`
- uses built-in Eindhoven demo trackers when no local config exists
- can enable Manager datapoint history for playback and telemetry charts
- does not emit fake Fleets marker objects; Fleets derives markers from history

Built-in trackers:

- Atlas 12
- Harbor 07
- Delta 24
- Nimbus 03
- Courier 19

Some profiles emit `trip`; others omit it so real-mode fallback segmentation stays exercised.

## What Not To Do

- Do not read mock fixture fields directly from UI components.
- Do not turn missing telemetry into fake zero values.
- Do not treat poor GNSS or low GSM as offline by itself.
- Do not create alarms from tracker telemetry in Fleets.
- Do not add attributes without checking Teltonika/OpenRemote behavior first.
