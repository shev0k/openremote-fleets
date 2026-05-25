from __future__ import annotations

import argparse
import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import run


def test_ensure_config_leaves_missing_config_for_builtin_defaults(tmp_path: Path) -> None:
    example = tmp_path / "example.yaml"
    config = tmp_path / "nested" / "emulator.local.yaml"
    example.write_text("manager: {}\n", encoding="utf-8")

    assert run.ensure_config(config, example_path=example) is False
    assert config.exists() is False
    assert config.parent.exists() is True

    config.write_text("changed: true\n", encoding="utf-8")
    assert run.ensure_config(config, example_path=example) is False
    assert config.read_text(encoding="utf-8") == "changed: true\n"


def test_choose_port_uses_requested_port_when_free() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        free_port = sock.getsockname()[1]

    assert run.choose_port("127.0.0.1", free_port) == free_port


def test_choose_port_falls_back_from_default_when_busy(monkeypatch) -> None:
    monkeypatch.setattr(run, "DEFAULT_PORT", 23000)
    busy = {23000, 23001}
    monkeypatch.setattr(run, "is_port_available", lambda _host, port: port not in busy)

    assert run.choose_port("127.0.0.1", None, fallback_span=3) == 23002


def test_build_server_command_forwards_runtime_options(tmp_path: Path) -> None:
    args = argparse.Namespace(host="0.0.0.0", no_autostart=True)
    python_path = tmp_path / ".venv" / "Scripts" / "python.exe"
    config_path = tmp_path / "config.yaml"

    command = run.build_server_command(python_path, args, 8092, config_path)

    assert command == [
        str(python_path),
        "-m",
        "teltonika_emulator",
        "--host",
        "0.0.0.0",
        "--port",
        "8092",
        "--config",
        str(config_path),
        "--no-autostart",
    ]


def test_browser_host_uses_loopback_for_wildcard_bind() -> None:
    assert run.browser_host("0.0.0.0") == "127.0.0.1"
    assert run.browser_host("::") == "127.0.0.1"
    assert run.browser_host("localhost") == "localhost"
