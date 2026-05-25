from __future__ import annotations

import asyncio
import ssl
from datetime import datetime, timezone

from app.models import TrackerConfig, TrackerState
from app.simulator import TrackerSimulator
from app.teltonika.codec8 import build_tcp_avl_packet


class TeltonikaTcpClient:
    def __init__(self, host: str, port: int, imei: str, use_tls: bool = False):
        self.host = host
        self.port = port
        self.imei = imei
        self.use_tls = use_tls
        self.reader: asyncio.StreamReader | None = None
        self.writer: asyncio.StreamWriter | None = None

    async def connect(self) -> None:
        ssl_context = ssl.create_default_context() if self.use_tls else None
        self.reader, self.writer = await asyncio.open_connection(self.host, self.port, ssl=ssl_context)
        imei_bytes = self.imei.encode("ascii")
        self.writer.write(len(imei_bytes).to_bytes(2, "big") + imei_bytes)
        await self.writer.drain()
        accepted = await self.reader.readexactly(1)
        if accepted != b"\x01":
            await self.close()
            raise ConnectionError("OpenRemote rejected Teltonika IMEI identification")

    async def send_state(self, state: TrackerState) -> int:
        if self.reader is None or self.writer is None:
            await self.connect()
        assert self.reader is not None
        assert self.writer is not None
        self.writer.write(build_tcp_avl_packet(state))
        await self.writer.drain()
        ack = await self.reader.readexactly(4)
        return int.from_bytes(ack, "big")

    async def close(self) -> None:
        if self.writer is not None:
            self.writer.close()
            await self.writer.wait_closed()
        self.reader = None
        self.writer = None


async def send_single_tcp_update(tracker: TrackerConfig, timestamp_ms: int | None = None) -> int:
    simulator = TrackerSimulator(tracker)
    state = simulator.current_state(timestamp_ms=timestamp_ms or int(datetime.now(timezone.utc).timestamp() * 1000))
    client = TeltonikaTcpClient(
        host=tracker.host or "127.0.0.1",
        port=tracker.port or 5027,
        imei=tracker.imei,
        use_tls=bool(tracker.tls),
    )
    try:
        await client.connect()
        return await client.send_state(state)
    finally:
        await client.close()

