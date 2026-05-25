from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
import time
from typing import AsyncIterator

from app.config_store import ConfigStore
from app.defaults import create_preset_tracker_configs
from app.manager_api import OpenRemoteManagerClient
from app.models import EmulatorConfig, MqttConnectionConfig, TrackerConfig, TrackerRuntimeStatus, TrackerState
from app.route_presets import get_route_preset_profile
from app.simulator import TrackerSimulator
from app.teltonika.client import TeltonikaTcpClient
from app.teltonika.mqtt_client import publish_mqtt_update


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TrackerRuntime:
    def __init__(self, tracker: TrackerConfig, config: EmulatorConfig, events: asyncio.Queue[str]):
        self.tracker = tracker
        self.config = config
        self.events = events
        self.simulator = TrackerSimulator(tracker)
        self.manager_client = OpenRemoteManagerClient(config.manager.api)
        self.history_setup_attempts = 0
        self.max_history_setup_attempts = 5
        self.history_setup_task: asyncio.Task[None] | None = None
        self.task: asyncio.Task[None] | None = None
        self.simulated_timestamp_ms: int | None = None
        self.status = TrackerRuntimeStatus(
            imei=tracker.imei,
            name=tracker.name,
            transport=tracker.transport,
            scenario=tracker.scenario,
        )

    async def start(self) -> None:
        if self.task and not self.task.done():
            return
        self.simulator = TrackerSimulator(self.tracker)
        self.simulated_timestamp_ms = None
        self.status.running = True
        self.status.connected = False
        self.status.last_error = None
        self.task = asyncio.create_task(self._run(), name=f"tracker-{self.tracker.imei}")
        await self.events.put(f"started {self.tracker.name} ({self.tracker.imei})")
        if self.tracker.scenario == "offline":
            await self.events.put(
                f"offline {self.tracker.name} will send one snapshot for Manager asset creation, then remain offline"
            )

    async def stop(self) -> None:
        self.status.running = False
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        await self._cancel_history_setup()
        self.status.connected = False
        await self.events.put(f"stopped {self.tracker.name} ({self.tracker.imei})")

    async def _run(self) -> None:
        tcp_client: TeltonikaTcpClient | None = None
        offline_snapshot_sent = False
        route_offline_snapshot_sent = False
        try:
            while self.status.running:
                if self.tracker.scenario == "offline":
                    if offline_snapshot_sent:
                        self.status.connected = False
                        await asyncio.sleep(self.tracker.update_interval)
                        continue
                timestamp_ms = self._timestamp_ms()
                state = self.simulator.current_state(timestamp_ms=timestamp_ms)
                route_completed_snapshot = self.simulator.route_completed and self.tracker.scenario != "offline"
                route_offline_phase = self._route_offline_phase_active()
                if route_offline_phase and route_offline_snapshot_sent:
                    self.status.connected = False
                    self.status.latitude = state.latitude
                    self.status.longitude = state.longitude
                    self.status.speed = state.speed
                    self.status.heading = state.heading
                    if tcp_client:
                        await tcp_client.close()
                        tcp_client = None
                    self._advance_timestamp()
                    self._advance_simulator()
                    await asyncio.sleep(self.tracker.update_interval)
                    continue
                try:
                    if self.tracker.transport == "tcp":
                        tcp_client = tcp_client or self._create_tcp_client()
                        ack_count = await tcp_client.send_state(state)
                        self.status.last_ack_count = ack_count
                    else:
                        await publish_mqtt_update(self._mqtt_config(), state)
                        self.status.last_ack_count = None
                    self.status.connected = True
                    self.status.last_error = None
                    self.status.last_message_at = utc_now_iso()
                    self.status.latitude = state.latitude
                    self.status.longitude = state.longitude
                    self.status.speed = state.speed
                    self.status.heading = state.heading
                    if route_completed_snapshot:
                        await self._sync_terminal_manager_history_setup(state.timestamp_ms)
                        self.status.connected = False
                        self.status.running = False
                        if tcp_client:
                            await tcp_client.close()
                            tcp_client = None
                        await self.events.put(
                            f"sent route complete snapshot {self.tracker.name} "
                            f"ignition off at {state.latitude},{state.longitude}"
                        )
                    elif self.tracker.scenario == "offline":
                        self._schedule_manager_history_sync(state.timestamp_ms)
                        self.status.connected = False
                        offline_snapshot_sent = True
                        if tcp_client:
                            await tcp_client.close()
                            tcp_client = None
                        await self.events.put(f"sent offline snapshot {self.tracker.name} {state.latitude},{state.longitude}")
                    elif route_offline_phase:
                        self._schedule_manager_history_sync(state.timestamp_ms)
                        self.status.connected = False
                        route_offline_snapshot_sent = True
                        if tcp_client:
                            await tcp_client.close()
                            tcp_client = None
                        await self.events.put(
                            f"sent route offline snapshot {self.tracker.name} "
                            f"at {state.latitude},{state.longitude}; pausing telemetry until the route resumes"
                        )
                    else:
                        self._schedule_manager_history_sync(state.timestamp_ms)
                        await self.events.put(f"sent {self.tracker.name} {state.speed} km/h {state.latitude},{state.longitude}")
                except Exception as exc:  # noqa: BLE001 - surfaced to UI status.
                    self.status.connected = False
                    self.status.last_error = str(exc)
                    await self.events.put(f"error {self.tracker.name}: {exc}")
                    if tcp_client:
                        await tcp_client.close()
                        tcp_client = None
                if self.status.running:
                    self._advance_timestamp()
                    self._advance_simulator()
                    await asyncio.sleep(self.tracker.update_interval)
        finally:
            if tcp_client:
                await tcp_client.close()
            await self._cancel_history_setup()
            self.status.connected = False

    def _create_tcp_client(self) -> TeltonikaTcpClient:
        tcp = self.config.manager.tcp
        return TeltonikaTcpClient(
            host=self.tracker.host or tcp.host,
            port=self.tracker.port or tcp.port,
            imei=self.tracker.imei,
            use_tls=self.tracker.tls if self.tracker.tls is not None else tcp.tls,
        )

    def _mqtt_config(self) -> MqttConnectionConfig:
        defaults = self.config.manager.mqtt
        return MqttConnectionConfig(
            host=self.tracker.host or defaults.host,
            port=self.tracker.port or defaults.port,
            tls=self.tracker.tls if self.tracker.tls is not None else defaults.tls,
            realm=self.tracker.mqtt_realm or defaults.realm,
            client_id=self.tracker.mqtt_client_id or defaults.client_id,
            username=self.tracker.mqtt_username or defaults.username,
            password=self.tracker.mqtt_password or defaults.password,
        )

    def _timestamp_ms(self) -> int:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        if not self.tracker.route_preset or self.tracker.route:
            return now_ms
        if self.simulated_timestamp_ms is None:
            profile = get_route_preset_profile(self.tracker.route_preset)
            self.simulated_timestamp_ms = now_ms - profile.history_backfill_minutes * 60_000
        return self.simulated_timestamp_ms

    def _advance_timestamp(self) -> None:
        if self.simulated_timestamp_ms is None or not self.tracker.route_preset or self.tracker.route:
            return
        self.simulated_timestamp_ms += round(self.tracker.update_interval * 1000)

    def _advance_simulator(self) -> None:
        self.simulator.advance(
            self._simulator_advance_seconds(),
            stop_at_phase_start=self._should_stop_at_route_phase_start(),
        )

    def _simulator_advance_seconds(self) -> float:
        return self.tracker.update_interval

    def _should_stop_at_route_phase_start(self) -> bool:
        return bool(self.tracker.route_preset and not self.tracker.route)

    def _route_offline_phase_active(self) -> bool:
        if not self.tracker.route_preset or self.tracker.route or self.tracker.scenario == "offline":
            return False
        active_phase = self.simulator._active_route_phase()
        return active_phase is not None and active_phase.kind == "offline"

    def _schedule_manager_history_sync(self, timestamp_ms: int | None = None) -> None:
        api = self.config.manager.api
        if not api.enabled or not api.auto_store_datapoints:
            return
        if self.history_setup_task and not self.history_setup_task.done():
            return
        self.history_setup_task = asyncio.create_task(
            self._sync_manager_history_setup(timestamp_ms),
            name=f"manager-history-{self.tracker.imei}",
        )

    async def _sync_terminal_manager_history_setup(self, timestamp_ms: int | None = None) -> None:
        api = self.config.manager.api
        if not api.enabled or not api.auto_store_datapoints:
            return
        if self.history_setup_task and not self.history_setup_task.done():
            try:
                await self.history_setup_task
            except asyncio.CancelledError:
                pass
        await self._sync_manager_history_setup(timestamp_ms)

    async def _sync_manager_history_setup(self, timestamp_ms: int | None = None) -> None:
        if not self.status.running:
            return
        self.history_setup_attempts += 1
        try:
            result = await self.manager_client.sync_tracker_asset(
                imei=self.tracker.imei,
                tracker_name=self.tracker.name,
                custom_attributes=self.tracker.custom_attributes,
                timestamp_ms=timestamp_ms,
            )
            self.history_setup_attempts = 0
            first_success = not self.status.manager_history_configured
            self.status.manager_history_configured = True
            self.status.manager_history_error = None
            if first_success:
                await self.events.put(
                    f"enabled Manager datapoint history for {self.tracker.name} "
                    f"({len(result.configured_attributes)} attributes)"
                )
        except Exception as exc:  # noqa: BLE001 - this must never stop telemetry.
            self.status.manager_history_error = str(exc)
            if self.history_setup_attempts == 1 or self.history_setup_attempts % self.max_history_setup_attempts == 0:
                await self.events.put(f"Manager datapoint sync pending for {self.tracker.name}: {exc}")

    @staticmethod
    def _manager_attribute_values(state: TrackerState) -> dict[str, object]:
        values: dict[str, object] = {
            "gpsLocation": {
                "type": "Point",
                "coordinates": [state.longitude, state.latitude],
            },
            "location": {
                "type": "Point",
                "coordinates": [state.longitude, state.latitude],
            },
            "altitude": state.altitude,
            "direction": state.heading,
            "satellites": state.satellites,
            "speed": state.speed,
            "priority": state.priority,
            "ignition": state.ignition,
            "movement": state.movement,
            "gsmSignal": state.gsm_signal,
            "externalVoltage": state.external_voltage,
            "batteryVoltage": state.battery_voltage,
            "batteryCurrent": state.battery_current,
            "batteryLevel": state.battery_level,
            "gnssStatus": 1 if state.gnss_status else 0,
            "gnssHdop": state.gnss_hdop,
            "totalOdometer": state.total_odometer,
            "tripOdometer": state.trip_odometer,
            "fuelUsedGps": state.fuel_used_gps,
            "fuelRateGps": state.fuel_rate_gps,
            "fuelLevel": state.fuel_level,
            "engineRpm": state.engine_rpm,
            "iButton": state.i_button,
            "sleepMode": state.sleep_mode,
            "dataMode": state.data_mode,
            "eventTriggered": state.event_id,
        }
        if state.trip is not None:
            values["trip"] = state.trip
        return values

    async def _cancel_history_setup(self) -> None:
        if not self.history_setup_task or self.history_setup_task.done():
            return
        self.history_setup_task.cancel()
        try:
            await self.history_setup_task
        except asyncio.CancelledError:
            pass


class EmulatorService:
    def __init__(self, store: ConfigStore):
        self.store = store
        self.config = store.load()
        self.events: asyncio.Queue[str] = asyncio.Queue()
        self.preset_imei_seed = int(time.time() * 1000) % 1_000_000_000
        self.runtimes = {tracker.imei: TrackerRuntime(tracker, self.config, self.events) for tracker in self.config.trackers}

    @classmethod
    def from_path(cls, config_path: Path) -> "EmulatorService":
        return cls(ConfigStore(config_path))

    async def start_enabled(self) -> None:
        for tracker in self.config.trackers:
            if tracker.enabled:
                await self.start_tracker(tracker.imei)

    async def stop_all(self) -> None:
        for runtime in list(self.runtimes.values()):
            await runtime.stop()

    async def start_all(self) -> None:
        for tracker in self.config.trackers:
            await self.start_tracker(tracker.imei)

    async def start_tracker(self, imei: str) -> None:
        runtime = self._runtime(imei)
        await runtime.start()

    async def stop_tracker(self, imei: str) -> None:
        runtime = self._runtime(imei)
        await runtime.stop()

    def get_config(self) -> EmulatorConfig:
        return self.config

    def replace_config(self, config: EmulatorConfig) -> EmulatorConfig:
        self.config = config
        self.store.save(config)
        self.runtimes = {tracker.imei: TrackerRuntime(tracker, self.config, self.events) for tracker in self.config.trackers}
        return self.config

    def add_tracker(self, tracker: TrackerConfig) -> TrackerConfig:
        if tracker.imei in self.runtimes:
            raise ValueError(f"tracker {tracker.imei} already exists")
        self.config.trackers.append(tracker)
        self.store.save(self.config)
        self.runtimes[tracker.imei] = TrackerRuntime(tracker, self.config, self.events)
        return tracker

    def deploy_preset_trackers(self) -> list[TrackerConfig]:
        trackers = create_preset_tracker_configs(self.config.trackers, imei_seed=self.preset_imei_seed)
        if not trackers:
            return []
        for tracker in trackers:
            self.config.trackers.append(tracker)
            self.runtimes[tracker.imei] = TrackerRuntime(tracker, self.config, self.events)
            self.events.put_nowait(f"deployed preset {tracker.name} ({tracker.imei})")
        self.store.save(self.config)
        return trackers

    async def update_tracker(self, imei: str, tracker: TrackerConfig) -> TrackerConfig:
        if imei not in self.runtimes:
            raise KeyError(imei)
        if tracker.imei != imei and tracker.imei in self.runtimes:
            raise ValueError(f"tracker {tracker.imei} already exists")
        await self.stop_tracker(imei)
        trackers = [tracker if item.imei == imei else item for item in self.config.trackers]
        if all(item.imei != tracker.imei for item in trackers):
            raise KeyError(imei)
        self.config.trackers = trackers
        self.store.save(self.config)
        self.runtimes.pop(imei, None)
        self.runtimes[tracker.imei] = TrackerRuntime(tracker, self.config, self.events)
        return tracker

    async def delete_tracker(self, imei: str) -> None:
        runtime = self._runtime(imei)
        tracker_name = runtime.tracker.name
        if runtime.status.running:
            await runtime.stop()
        self.config.trackers = [tracker for tracker in self.config.trackers if tracker.imei != imei]
        self.store.save(self.config)
        self.runtimes.pop(imei, None)
        await self.events.put(f"removed {tracker_name} ({imei})")

    def statuses(self) -> list[TrackerRuntimeStatus]:
        return [self.runtimes[tracker.imei].status for tracker in self.config.trackers if tracker.imei in self.runtimes]

    async def event_stream(self) -> AsyncIterator[str]:
        while True:
            message = await self.events.get()
            yield f"data: {message}\n\n"

    def _runtime(self, imei: str) -> TrackerRuntime:
        runtime = self.runtimes.get(imei)
        if runtime is None:
            raise KeyError(imei)
        return runtime
