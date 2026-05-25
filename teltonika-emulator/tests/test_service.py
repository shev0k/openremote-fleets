from __future__ import annotations

import asyncio
from pathlib import Path

from app.config_store import ConfigStore
from app.manager_api import ManagerHistorySetupResult
from app.models import EmulatorConfig, ManagerApiConfig, ManagerConfig, TcpConnectionConfig, TrackerConfig
import app.service as service_module
from app.service import EmulatorService, TrackerRuntime


async def test_offline_tracker_sends_one_creation_snapshot_then_stays_offline(tmp_path: Path) -> None:
    received_identification = b""
    received_packet = b""
    snapshot_received = asyncio.Event()

    async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        nonlocal received_identification, received_packet
        received_identification = await reader.readexactly(17)
        writer.write(b"\x01")
        await writer.drain()
        header = await reader.readexactly(8)
        data_length = int.from_bytes(header[4:8], "big")
        body = await reader.readexactly(data_length + 4)
        received_packet = header + body
        writer.write((1).to_bytes(4, "big"))
        await writer.drain()
        snapshot_received.set()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    host, port = server.sockets[0].getsockname()[:2]
    store = ConfigStore(tmp_path / "config.yaml")
    imei = "352093086403655"
    store.save(
        EmulatorConfig(
            manager=ManagerConfig(
                tcp=TcpConnectionConfig(host=host, port=port),
                api=ManagerApiConfig(enabled=False),
            ),
            trackers=[
                TrackerConfig(
                    imei=imei,
                    name="Offline Atlas",
                    scenario="offline",
                    update_interval=3600,
                ),
            ],
        )
    )
    service = EmulatorService(store)

    try:
        await service.start_tracker(imei)
        await asyncio.wait_for(snapshot_received.wait(), timeout=2)
        for _ in range(20):
            status = service.statuses()[0].model_copy()
            if status.last_message_at is not None:
                break
            await asyncio.sleep(0.01)
    finally:
        await service.stop_all()
        server.close()
        await server.wait_closed()

    assert received_identification == b"\x00\x0f352093086403655"
    assert received_packet.startswith(b"\x00\x00\x00\x00")
    assert status.running is True
    assert status.connected is False
    assert status.speed == 0
    assert status.latitude == 51.441642
    assert status.longitude == 5.469722
    assert status.last_message_at is not None
    assert status.last_message_at.endswith("Z")
    assert "+00:00" not in status.last_message_at


async def test_completed_route_sends_terminal_snapshot_then_stops_streaming(tmp_path: Path, monkeypatch) -> None:
    received_packets: list[bytes] = []
    two_packets_received = asyncio.Event()

    async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        await reader.readexactly(17)
        writer.write(b"\x01")
        await writer.drain()
        try:
            while True:
                header = await reader.readexactly(8)
                data_length = int.from_bytes(header[4:8], "big")
                body = await reader.readexactly(data_length + 4)
                received_packets.append(header + body)
                writer.write((1).to_bytes(4, "big"))
                await writer.drain()
                if len(received_packets) == 2:
                    two_packets_received.set()
        except asyncio.IncompleteReadError:
            pass
        finally:
            writer.close()
            await writer.wait_closed()

    manager_history_calls: list[str] = []
    timestamp_write_calls: list[str] = []

    class FakeManagerClient:
        def __init__(self, config: ManagerApiConfig):
            self.config = config

        async def sync_tracker_asset(
            self,
            *,
            imei: str,
            tracker_name: str | None,
            custom_attributes,
            timestamp_ms: int | None = None,
        ) -> ManagerHistorySetupResult:
            manager_history_calls.append(imei)
            assert tracker_name == "Short Route"
            return ManagerHistorySetupResult(
                asset_id="teltonika-asset-1",
                configured_attributes=["location", "speed"],
                changed=True,
            )

        async def sync_tracker_datapoints(
            self,
            imei: str,
            values: dict[str, object],
            timestamp_ms: int,
        ) -> ManagerHistorySetupResult:
            timestamp_write_calls.append(imei)
            return ManagerHistorySetupResult(
                asset_id="teltonika-asset-1",
                configured_attributes=["location", "speed"],
                changed=True,
                written_attributes=["location", "speed"],
            )

    monkeypatch.setattr(service_module, "OpenRemoteManagerClient", FakeManagerClient)

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    host, port = server.sockets[0].getsockname()[:2]
    store = ConfigStore(tmp_path / "config.yaml")
    imei = "352093086403655"
    store.save(
        EmulatorConfig(
            manager=ManagerConfig(tcp=TcpConnectionConfig(host=host, port=port)),
            trackers=[
                TrackerConfig(
                    imei=imei,
                    name="Short Route",
                    route=[
                        [51.441642, 5.469722],
                        [51.441650, 5.469730],
                    ],
                    speed=120,
                    update_interval=0.2,
                ),
            ],
        )
    )
    service = EmulatorService(store)

    try:
        await service.start_tracker(imei)
        await asyncio.wait_for(two_packets_received.wait(), timeout=2)
        await asyncio.sleep(0.3)
        status = service.statuses()[0].model_copy()
    finally:
        await service.stop_all()
        server.close()
        await server.wait_closed()

    assert len(received_packets) == 2
    assert status.running is False
    assert status.connected is False
    assert status.speed == 0
    assert status.latitude == 51.44165
    assert status.longitude == 5.46973
    assert manager_history_calls == [imei, imei]
    assert timestamp_write_calls == []


async def test_tracker_enables_manager_history_after_first_successful_send(tmp_path: Path, monkeypatch) -> None:
    snapshot_received = asyncio.Event()

    async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        await reader.readexactly(17)
        writer.write(b"\x01")
        await writer.drain()
        header = await reader.readexactly(8)
        data_length = int.from_bytes(header[4:8], "big")
        await reader.readexactly(data_length + 4)
        writer.write((1).to_bytes(4, "big"))
        await writer.drain()
        snapshot_received.set()
        writer.close()
        await writer.wait_closed()

    manager_history_calls: list[str] = []
    timestamp_write_calls: list[str] = []

    class FakeManagerClient:
        def __init__(self, config: ManagerApiConfig):
            self.config = config

        async def sync_tracker_asset(
            self,
            *,
            imei: str,
            tracker_name: str | None,
            custom_attributes,
            timestamp_ms: int | None = None,
        ) -> ManagerHistorySetupResult:
            manager_history_calls.append(imei)
            assert tracker_name == "Atlas"
            return ManagerHistorySetupResult(
                asset_id="teltonika-asset-1",
                configured_attributes=["location", "speed"],
                changed=True,
            )

        async def sync_tracker_datapoints(
            self,
            imei: str,
            values: dict[str, object],
            timestamp_ms: int,
        ) -> ManagerHistorySetupResult:
            timestamp_write_calls.append(imei)
            return ManagerHistorySetupResult(
                asset_id="teltonika-asset-1",
                configured_attributes=["location", "speed"],
                changed=True,
                written_attributes=["location", "speed"],
            )

    monkeypatch.setattr(service_module, "OpenRemoteManagerClient", FakeManagerClient)

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    host, port = server.sockets[0].getsockname()[:2]
    store = ConfigStore(tmp_path / "config.yaml")
    imei = "352093086403655"
    store.save(
        EmulatorConfig(
            manager=ManagerConfig(tcp=TcpConnectionConfig(host=host, port=port)),
            trackers=[
                TrackerConfig(
                    imei=imei,
                    name="Atlas",
                    scenario="offline",
                    update_interval=3600,
                ),
            ],
        )
    )
    service = EmulatorService(store)

    try:
        await service.start_tracker(imei)
        await asyncio.wait_for(snapshot_received.wait(), timeout=2)
        for _ in range(20):
            status = service.statuses()[0].model_copy()
            if status.manager_history_configured:
                break
            await asyncio.sleep(0.01)
    finally:
        await service.stop_all()
        server.close()
        await server.wait_closed()

    assert manager_history_calls == [imei]
    assert timestamp_write_calls == []
    assert status.manager_history_configured is True
    assert status.manager_history_error is None


async def test_route_preset_offline_phase_sends_one_snapshot_then_creates_gap(monkeypatch) -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Nimbus",
        transport="mqtt",
        route_preset="nimbus_eindhoven",
        update_interval=300,
    )
    runtime = TrackerRuntime(
        tracker,
        EmulatorConfig(
            manager=ManagerConfig(api=ManagerApiConfig(enabled=False)),
            trackers=[tracker],
        ),
        asyncio.Queue(),
    )
    published_states = []
    original_sleep = asyncio.sleep

    for phase_kind in ["offline"]:
        while True:
            active_phase = runtime.simulator._active_route_phase()
            if active_phase is not None and active_phase.kind == phase_kind:
                break
            runtime.simulator.advance(300, stop_at_phase_start=True)

    async def fake_publish(_config, state):
        published_states.append((state, runtime._route_offline_phase_active()))
        if not runtime._route_offline_phase_active() and len(published_states) > 1:
            runtime.status.running = False

    async def fast_sleep(_seconds):
        await original_sleep(0)

    monkeypatch.setattr(service_module, "publish_mqtt_update", fake_publish)
    monkeypatch.setattr(service_module.asyncio, "sleep", fast_sleep)

    runtime.status.running = True
    runtime.simulated_timestamp_ms = 1_778_783_600_000

    await asyncio.wait_for(runtime._run(), timeout=1)

    assert sum(1 for state, active_offline_phase in published_states if state.data_mode == 4 and active_offline_phase) == 1
    assert published_states[0][0].data_mode == 4
    assert published_states[-1][1] is False
    assert runtime.status.connected is False


def test_route_preset_runtime_uses_backfilled_wall_clock_timestamps() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        update_interval=5,
    )
    runtime = TrackerRuntime(tracker, EmulatorConfig(trackers=[tracker]), asyncio.Queue())

    first = runtime._timestamp_ms()
    runtime._advance_timestamp()
    second = runtime._timestamp_ms()

    assert second - first == 5_000


def test_route_preset_runtime_advances_route_on_wall_clock_time() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        route_preset="atlas_eindhoven",
        update_interval=5,
    )
    runtime = TrackerRuntime(tracker, EmulatorConfig(trackers=[tracker]), asyncio.Queue())
    first_timestamp = runtime._timestamp_ms()
    first_state = runtime.simulator.current_state(timestamp_ms=first_timestamp)

    for _ in range(100):
        if runtime.simulator.route_completed:
            break
        runtime._advance_timestamp()
        runtime._advance_simulator()

    second_state = runtime.simulator.current_state(timestamp_ms=runtime._timestamp_ms())

    assert runtime._timestamp_ms() - first_timestamp == 500_000
    assert runtime.simulator.route_completed is False
    assert (second_state.latitude, second_state.longitude) != (first_state.latitude, first_state.longitude)


async def test_manager_history_sync_keeps_retrying_after_startup_failures() -> None:
    tracker = TrackerConfig(
        imei="352093086403655",
        name="Atlas",
        update_interval=0.2,
    )
    runtime = TrackerRuntime(tracker, EmulatorConfig(trackers=[tracker]), asyncio.Queue())
    calls = 0

    class FailingManagerClient:
        async def sync_tracker_asset(
            self,
            *,
            imei: str,
            tracker_name: str | None,
            custom_attributes,
            timestamp_ms: int | None = None,
        ) -> ManagerHistorySetupResult:
            nonlocal calls
            calls += 1
            assert tracker_name == "Atlas"
            raise RuntimeError("Manager not ready")

        async def sync_tracker_datapoints(
            self,
            imei: str,
            values: dict[str, object],
            timestamp_ms: int,
        ) -> ManagerHistorySetupResult:
            raise AssertionError("history setup should not mirror protocol telemetry through timestamped writes")

    runtime.manager_client = FailingManagerClient()
    runtime.status.running = True

    for _ in range(runtime.max_history_setup_attempts + 2):
        runtime._schedule_manager_history_sync()
        assert runtime.history_setup_task is not None
        await runtime.history_setup_task

    assert calls == runtime.max_history_setup_attempts + 2
    assert runtime.status.manager_history_error == "Manager not ready"
