# Teltonika FMC003 Emulator

This is a local Python emulator for testing the real Teltonika path without a physical tracker.

```text
emulated FMC003 -> OpenRemote Manager -> openremote-fleets real mode
```

The emulator sends realistic tracker data to OpenRemote Manager. Fleets then reads the resulting `TeltonikaTrackerAsset` data in real mode, the same way it would read hardware tracker data.

Use it when you need to check real Manager integration, route playback, telemetry charts, asset metadata, or live vehicle status. Use normal Fleets mock mode when you only need fast UI work without Manager.

## Quick Start

Requirements:

- Python 3.11 or newer
- npm dependencies installed for the Fleets app
- OpenRemote Manager running when you want a full end-to-end test

From PowerShell:

```powershell
cd teltonika-emulator
.\run.ps1
```

From Command Prompt:

```bat
cd teltonika-emulator
run.bat
```

From macOS or Linux:

```bash
cd teltonika-emulator
python3 run.py
```

The launcher:

- creates `.venv` if it is missing
- installs Python dependencies when `pyproject.toml` changes
- starts the FastAPI web app
- opens the browser automatically
- uses port `8090`, or the next available port when `8090` is busy
- uses built-in demo trackers when `config/emulator.local.yaml` does not exist

The UI is usually available at:

```text
http://127.0.0.1:8090
```

Useful flags:

```bash
python run.py --no-open
python run.py --no-autostart
python run.py --port 8095
python run.py --reinstall
python run.py --skip-install
```

## Manager Setup

For the normal TCP path, Manager needs the Teltonika protocol enabled and a Teltonika agent with a reachable TCP port.

From the repository root, start the local Teltonika-enabled Manager:

```powershell
.\scripts\run-openremote-manager-local.ps1
```

That script builds the local Manager reference tree and starts Docker with `openremote/manager:teltonika-local`. Manager is available at:

```text
https://localhost/manager
```

The local Teltonika TCP port is exposed as:

```text
localhost:5027
```

Manager setup checklist:

1. Start the local Manager script above.
2. In Manager, create or configure a Teltonika agent.
3. Set the agent transport to `TCP` or `BOTH`.
4. Set the agent bind port to `5027`.
5. In the emulator config, keep `manager.tcp.host` as `127.0.0.1` and `manager.tcp.port` as `5027`.
6. Start one or more trackers in the emulator UI.
7. Run Fleets in real mode with `npm run dev`.

Manager should create or update one `TeltonikaTrackerAsset` per 15-digit IMEI. Fleets real mode should then show those trackers in Live Fleet, Assets, playback, and telemetry views.

## TCP And MQTT

TCP is the main path:

- tracker connects to the Manager Teltonika TCP agent
- tracker sends IMEI identification
- Manager replies with one accept byte
- tracker sends Codec 8 AVL packets
- Manager replies with the accepted record count

MQTT is a fallback path for local setups where TCP is awkward:

```yaml
manager:
  mqtt:
    host: 127.0.0.1
    port: 1883
    realm: master
    client_id: fleet-emulator
```

MQTT publishes to:

```text
{realm}/{client_id}/teltonika/{imei}/data
```

The MQTT payload uses raw Teltonika values. For example, `3.812 V` battery voltage is sent as `3812`, and `0.8` HDOP is sent as `8`.

## Config

The local config path is:

```text
config/emulator.local.yaml
```

That file is ignored by git. If it is missing, the app loads the built-in demo fleet from `app/defaults.py`.

Saving config through the UI or API writes `config/emulator.local.yaml`. Copy `config/emulator.example.yaml` only when you want to start from one explicit sample tracker instead of the built-in five-tracker demo.

Important tracker fields:

- `imei`: required 15-digit device identity
- `name`: display name used for the local UI and Manager asset rename
- `transport`: `tcp` or `mqtt`
- `scenario`: `moving`, `parked`, `offline`, `low_battery`, `weak_gnss`, or `overspeed`
- `route_preset`: built-in Eindhoven route name
- `route`: optional custom YAML route; when present, it wins over `route_preset`
- `route_progress`: starting point along a built-in route
- `update_interval`: seconds between sends
- `custom_attributes`: optional Manager-side `driverName`, `plate`, and `assetClass`

Do not commit local Manager credentials, MQTT credentials, or `config/emulator.local.yaml`.

## Built-In Demo Fleet

The built-in presets match the Fleets mock tracker names, IMEIs, and supported Teltonika values.

| Tracker | IMEI | Route preset | Why it exists |
| --- | --- | --- | --- |
| Atlas 12 | `352093086403655` | `atlas_eindhoven` | Normal moving route with stop, idle, and engine-off evidence. |
| Harbor 07 | `352094085231592` | `harbor_eindhoven` | Omits `trip`, so Fleets fallback trip segmentation is exercised. |
| Delta 24 | `352094085231600` | `delta_eindhoven` | Faster route with degraded GNSS/GSM while moving. |
| Nimbus 03 | `352094085231618` | `nimbus_eindhoven` | Includes an early offline gap and later engine-off event. |
| Courier 19 | `352094085231626` | `courier_eindhoven` | Delivery-style route with idle, break, and offline phases. |

Use **Deploy all presets** in the web UI when you want the full demo set. Existing preset trackers are skipped, so the button is safe to press more than once.

## Web UI

The UI supports:

- start and stop all trackers
- start and stop one tracker
- add, edit, or remove local tracker configs
- deploy all built-in presets
- choose TCP or MQTT transport
- choose a route preset or fixed location
- add optional Fleets metadata attributes
- view current runtime status
- view recent send/error events

Operator timestamps in the UI use the browser locale and time zone. Teltonika payload timestamps stay as UTC epoch milliseconds.

The public local API is:

- `GET /api/config`
- `PUT /api/config`
- `POST /api/trackers`
- `POST /api/trackers/deploy-presets`
- `PATCH /api/trackers/{imei}`
- `DELETE /api/trackers/{imei}`
- `POST /api/trackers/{imei}/start`
- `POST /api/trackers/{imei}/stop`
- `POST /api/control/start-all`
- `POST /api/control/stop-all`
- `GET /api/status`
- `GET /api/events`

## Manager History

Route playback and charts need OpenRemote datapoint storage. Manager only stores history for attributes with `storeDataPoints` enabled.

The emulator enables useful datapoint storage automatically by default after Manager creates the `TeltonikaTrackerAsset`. It:

- logs in to Manager through the configured API user
- finds the tracker asset by IMEI
- renames the asset to the emulator tracker name
- sets `storeDataPoints: true` on selected telemetry attributes
- optionally applies `dataPointsMaxAgeDays`
- creates optional text attributes for `driverName`, `plate`, and `assetClass`

Default Manager API config:

```yaml
manager:
  api:
    enabled: true
    base_url: https://localhost
    realm: master
    client_id: openremote
    username: admin
    password: secret
    verify_tls: false
    auto_store_datapoints: true
```

Change the username/password if your local Manager admin account is different. Set `auto_store_datapoints: false` only when you want to manage history metadata by hand.

This only affects new datapoints after the setting is enabled. Manager cannot backfill route history for messages that arrived before datapoint storage was enabled.

## Emitted Data

The emulator emits the Fleets-supported Teltonika subset:

- GPS position, altitude, heading, satellites, and speed
- ignition, movement, optional `trip`, event id, and priority
- GSM signal, GNSS status, and HDOP
- external voltage, battery voltage/current/level
- total and trip odometer
- GPS fuel used, fuel rate, and fuel level
- sleep mode, data mode, engine RPM, and `iButton`

The emulator does not emit fake Fleets route markers. Fleets derives stop, idle, break, offline, signal, and engine-off markers from Manager history.

## Code Map

| Area | Files |
| --- | --- |
| FastAPI app and routes | `app/main.py` |
| Config models | `app/models.py` |
| YAML load/save | `app/config_store.py` |
| Tracker runtime lifecycle | `app/service.py` |
| Movement and scenarios | `app/simulator.py` |
| Built-in demo trackers | `app/defaults.py` |
| Built-in route presets | `app/route_presets.py` |
| Manager asset/history sync | `app/manager_api.py` |
| Codec 8 TCP framing | `app/teltonika/codec8.py`, `app/teltonika/client.py` |
| MQTT fallback payloads | `app/teltonika/mqtt_payload.py`, `app/teltonika/mqtt_client.py` |
| Web UI assets | `app/templates/index.html`, `app/static/` |
| CLI entrypoint | `teltonika_emulator/__main__.py` |
| Launcher | `run.py`, `run.ps1`, `run.bat`, `run.sh` |

## Tests

Run emulator tests from `teltonika-emulator/`:

```bash
python -m pytest
```

The tests cover:

- Codec 8 packet framing and CRC-16/IBM
- TCP IMEI handshake and ACK handling
- MQTT topic and raw scaled Teltonika values
- route preset decoding and no-teleport guards
- simulator state for moving, parked, offline, and scenario variants
- Manager asset rename, custom metadata, and datapoint history setup
- FastAPI UI, config, tracker CRUD, and preset deployment
- alignment with Fleets mock fixture values

Manual end-to-end validation still needs a running OpenRemote Manager with a Teltonika TCP agent or MQTT broker.

## Docs

- [Protocol and Manager notes](docs/01-protocol-and-manager-notes.md)
- [Fleets Teltonika data handoff](../docs/03-live-fleets/04-teltonika-openremote-data.md)
