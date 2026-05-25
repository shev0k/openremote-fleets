# 01. Protocol And Manager Notes

This page keeps the lower-level emulator details in one place. Use it when changing Codec 8 packets, MQTT payloads, Manager history setup, or Fleets Teltonika mapping.

The emulator code lives in `teltonika-emulator/`. The Fleets mapping handoff lives in `docs/03-live-fleets/04-teltonika-openremote-data.md`.

## References

Useful external references:

- Teltonika FMC003 docs
- Teltonika data sending protocol docs
- Teltonika AVL parameter ID docs
- OpenRemote MQTT API docs
- OpenRemote Teltonika partner integration docs

Useful local Manager references:

- `openremote-manager/agent/src/main/java/org/openremote/agent/protocol/teltonika/`
- `openremote-manager/manager/src/main/java/org/openremote/manager/telematics/`
- `openremote-manager/model/src/main/java/org/openremote/model/telematics/teltonika/`
- `openremote-manager/test/src/test/groovy/org/openremote/test/protocol/mqtt/TeltonikaMQTTClientProtocolTest.groovy`

`openremote-manager/` is read-only. Use it to understand behavior, not as an edit target.

## End-To-End Shape

```text
TrackerConfig
  -> TrackerSimulator
  -> Codec 8 TCP packet or MQTT JSON payload
  -> OpenRemote Manager Teltonika integration
  -> TeltonikaTrackerAsset attributes and datapoints
  -> Fleets real-mode repositories and mappers
```

The emulator should stay close to real Manager behavior. It should not write Fleets-only marker objects, fake UI state, or app-specific DTOs.

## Native TCP Flow

The main transport is Teltonika TCP Codec 8.

1. The emulator opens a TCP connection to the Manager Teltonika agent.
2. It sends a 2-byte IMEI length followed by the ASCII IMEI.
3. Manager replies with one byte.
4. `0x01` means the IMEI was accepted.
5. The emulator sends one Codec 8 AVL packet per update interval.
6. Manager replies with a 4-byte accepted record count.
7. The emulator reconnects after send, ACK, or network failures.

The TCP code is in:

- `app/teltonika/client.py`
- `app/teltonika/codec8.py`

## Codec 8 Packet Shape

A TCP AVL packet is:

```text
4-byte zero preamble
4-byte data length
payload
4-byte CRC-16/IBM over payload
```

The payload is:

```text
codec id
record count
AVL records
record count again
```

Each record includes:

- timestamp in UTC epoch milliseconds
- priority
- longitude and latitude scaled by `10_000_000`
- altitude, heading, satellites, and GPS speed
- event IO id
- IO groups for 1-byte, 2-byte, 4-byte, and 8-byte values

The emulator implements Codec 8 because the Fleets-supported FMC003 values fit one-byte AVL IDs. It does not implement Codec 8E, UDP, commands, or device configuration.

## MQTT Fallback

The MQTT fallback publishes OpenRemote Teltonika JSON to:

```text
{realm}/{client_id}/teltonika/{imei}/data
```

Payload shape:

```json
{
  "state": {
    "reported": {
      "ts": 1782290930000,
      "latlng": "51.441642,5.469722"
    }
  }
}
```

Scaled Teltonika values are sent as raw values:

| Meaning | Human value | MQTT raw value |
| --- | --- | --- |
| battery voltage | `3.812 V` | `3812` |
| external voltage | `12.184 V` | `12184` |
| battery current | `0.064 A` | `64` |
| GNSS HDOP | `0.8` | `8` |
| fuel used GPS | `31.4 l` | `31400` |
| fuel rate GPS | `28.4 l/100km` | `2840` |

MQTT payload code is in:

- `app/teltonika/mqtt_payload.py`
- `app/teltonika/mqtt_client.py`

## Selected Attributes

The emulator emits the same practical subset documented by Fleets.

| Fleets use | OpenRemote attribute | Teltonika id |
| --- | --- | --- |
| position | `gpsLocation` / `location` | `latlng` |
| altitude | `altitude` | `alt` |
| heading | `direction` | `ang` |
| satellites | `satellites` | `sat` |
| speed | `speed` | `24` and GPS speed field |
| frame priority | `priority` | `pr` |
| event id | `eventTriggered` | `evt` |
| ignition | `ignition` | `239` |
| movement | `movement` | `240` |
| trip state | `trip` | `250` |
| GSM signal | `gsmSignal` | `21` |
| external power | `externalVoltage` | `66` |
| battery voltage | `batteryVoltage` | `67` |
| battery current | `batteryCurrent` | `68` |
| battery level | `batteryLevel` | `113` |
| GNSS status | `gnssStatus` | `69` |
| GNSS HDOP | `gnssHdop` | `182` |
| total odometer | `totalOdometer` | `16` |
| trip odometer | `tripOdometer` | `199` |
| GPS fuel used | `fuelUsedGps` | `12` |
| GPS fuel rate | `fuelRateGps` | `13` |
| fuel level | `fuelLevel` | `48` |
| sleep mode | `sleepMode` | `200` |
| data mode | `dataMode` | `80` |
| engine RPM | `engineRpm` | `36` |
| driver/device id | `iButton` | `78` |

Some route profiles intentionally omit `trip` AVL `250`. That keeps Fleets fallback trip segmentation tested in real mode.

## Manager Asset Sync

OpenRemote Manager creates or updates `TeltonikaTrackerAsset` assets by IMEI.

After a successful send, the emulator can use Manager REST APIs to:

- authenticate with the configured realm/client/user
- query `TeltonikaTrackerAsset` assets
- find the asset with the matching `imei` attribute
- rename it to the configured tracker name
- set `storeDataPoints: true` on useful telemetry attributes
- optionally set `dataPointsMaxAgeDays`
- create optional text attributes for `driverName`, `plate`, and `assetClass`

This sync is best-effort. Failure to sync Manager metadata should not stop telemetry streaming.

The emulator does not mirror every packet through Manager's timestamped attribute-write endpoint during normal streaming. Native TCP or MQTT should own the telemetry history. Duplicating every point through the REST endpoint would create a second copy of the same route.

Manager sync code is in:

- `app/manager_api.py`
- `app/service.py`

## Route Presets

The built-in routes are Eindhoven road paths aligned with the Fleets mock fixture names and tracker identities.

| Preset | Tracker | Notes |
| --- | --- | --- |
| `atlas_eindhoven` | Atlas 12 | Moving route with short stop, idle period, and engine-off telemetry. |
| `harbor_eindhoven` | Harbor 07 | Omits `trip`, includes break and stop evidence. |
| `delta_eindhoven` | Delta 24 | Faster route with a degraded-signal window. |
| `nimbus_eindhoven` | Nimbus 03 | Early offline gap and later engine-off event. |
| `courier_eindhoven` | Courier 19 | Delivery-style idle, break, and late offline gap. |

Preset timestamps are initially backfilled so playback has a recent history window. After startup, timestamps and route movement advance at the tracker update interval.

Offline phases send one offline snapshot, then pause telemetry until the route resumes. That gives Fleets real missing-history gaps instead of fake repeated offline points.

## Scenarios

Scenario behavior is applied on top of the selected route:

- `moving`: normal route movement and changing telemetry
- `parked`: fixed position, zero speed, no movement
- `offline`: one stopped snapshot, then no repeated telemetry
- `low_battery`: lower battery and voltage while following the route
- `weak_gnss`: degraded satellites, HDOP, GSM, and GNSS status
- `overspeed`: higher moving speed, priority, RPM, and fuel rate

When a moving tracker reaches the end of a route, it sends one final stopped/offline-style snapshot and stops. It does not loop forever.

## Validation

Automated tests cover the emulator contract:

- `test_codec8.py`: packet framing, coordinates, CRC, `iButton`, and optional `trip`
- `test_tcp_client.py`: IMEI handshake and ACK handling
- `test_mqtt_payload.py`: topic shape and raw scaled values
- `test_simulation.py`: route movement, scenarios, and terminal behavior
- `test_manager_api.py`: Manager auth/query/update behavior
- `test_manager_history_attributes.py`: default history attributes
- `test_mock_fixture_alignment.py`: alignment with Fleets mock tracker values and routes
- `test_web_api.py`: web UI, local API, presets, and validation

Run:

```bash
cd teltonika-emulator
python -m pytest
```

Manual end-to-end validation still needs real Manager running with a Teltonika TCP agent or MQTT broker.

## Known Limits

- Codec 8E is not implemented.
- UDP is not implemented.
- Device command handling is not implemented.
- OBD values are realistic test values, not exact CAN bus behavior.
- Local Manager deployments may need manual Teltonika TCP port exposure.
- MQTT auth/TLS varies by deployment, so keep those values configurable.

