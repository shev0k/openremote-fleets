from __future__ import annotations

import asyncio

from app.models import TrackerConfig
from app.teltonika.client import send_single_tcp_update


async def test_tcp_client_sends_imei_identification_and_packet_then_reads_ack() -> None:
    received_identification = b""
    received_packet = b""

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
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    host, port = server.sockets[0].getsockname()[:2]
    tracker = TrackerConfig(imei="352093086403655", name="Atlas", host=host, port=port)

    try:
        ack_count = await send_single_tcp_update(tracker, timestamp_ms=1_782_290_930_000)
    finally:
        server.close()
        await server.wait_closed()

    assert received_identification == b"\x00\x0f352093086403655"
    assert received_packet.startswith(b"\x00\x00\x00\x00")
    assert ack_count == 1
