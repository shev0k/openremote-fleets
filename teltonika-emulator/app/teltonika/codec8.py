from __future__ import annotations

from app.models import TrackerState

CODEC_8 = 0x08


def crc16_ibm(data: bytes) -> int:
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
            crc &= 0xFFFF
    return crc


def build_tcp_avl_packet(state: TrackerState) -> bytes:
    payload = build_codec8_payload([state])
    return b"\x00\x00\x00\x00" + len(payload).to_bytes(4, "big") + payload + crc16_ibm(payload).to_bytes(4, "big")


def build_codec8_payload(states: list[TrackerState]) -> bytes:
    if not states:
        raise ValueError("at least one tracker state is required")
    if len(states) > 255:
        raise ValueError("Codec 8 packet can contain at most 255 records")
    records = b"".join(_build_record(state) for state in states)
    count = len(states).to_bytes(1, "big")
    return bytes([CODEC_8]) + count + records + count


def _build_record(state: TrackerState) -> bytes:
    latitude = round(state.latitude * 10_000_000)
    longitude = round(state.longitude * 10_000_000)
    io_elements = _io_elements(state)
    return b"".join(
        [
            state.timestamp_ms.to_bytes(8, "big"),
            _uint(state.priority, 1),
            _sint(longitude, 4),
            _sint(latitude, 4),
            _sint(state.altitude, 2),
            _uint(state.heading, 2),
            _uint(state.satellites, 1),
            _uint(state.speed, 2),
            _uint(state.event_id, 1),
            _uint(len(io_elements), 1),
            _pack_group(1, [(identifier, value) for identifier, value, size in io_elements if size == 1]),
            _pack_group(2, [(identifier, value) for identifier, value, size in io_elements if size == 2]),
            _pack_group(4, [(identifier, value) for identifier, value, size in io_elements if size == 4]),
            _pack_group(8, [(identifier, value) for identifier, value, size in io_elements if size == 8]),
        ],
    )


def _io_elements(state: TrackerState) -> list[tuple[int, int, int]]:
    elements: list[tuple[int, int, int]] = [
        (239, int(state.ignition), 1),
        (240, int(state.movement), 1),
        (21, state.gsm_signal, 1),
        (113, state.battery_level, 1),
        (69, int(state.gnss_status), 1),
        (48, state.fuel_level, 1),
        (200, state.sleep_mode, 1),
        (80, state.data_mode, 1),
        (66, round(state.external_voltage * 1000), 2),
        (67, round(state.battery_voltage * 1000), 2),
        (68, round(state.battery_current * 1000), 2),
        (182, round(state.gnss_hdop * 10), 2),
        (36, state.engine_rpm, 2),
        (13, round(state.fuel_rate_gps * 100), 2),
        (16, state.total_odometer, 4),
        (199, state.trip_odometer, 4),
        (12, round(state.fuel_used_gps * 1000), 4),
    ]
    if state.trip is not None:
        elements.insert(2, (250, int(state.trip), 1))
    if state.i_button:
        elements.append((78, int(state.i_button, 16), 8))
    return elements


def _pack_group(size: int, elements: list[tuple[int, int]]) -> bytes:
    if len(elements) > 255:
        raise ValueError("Codec 8 IO group can contain at most 255 elements")
    body = bytearray([len(elements)])
    for identifier, value in elements:
        body.extend(_uint(identifier, 1))
        body.extend(_uint(value, size))
    return bytes(body)


def _uint(value: int, size: int) -> bytes:
    max_value = (1 << (size * 8)) - 1
    return max(0, min(max_value, round(value))).to_bytes(size, "big", signed=False)


def _sint(value: int, size: int) -> bytes:
    min_value = -(1 << (size * 8 - 1))
    max_value = (1 << (size * 8 - 1)) - 1
    return max(min_value, min(max_value, round(value))).to_bytes(size, "big", signed=True)
