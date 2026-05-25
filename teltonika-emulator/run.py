from __future__ import annotations

import argparse
import hashlib
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import venv
import webbrowser
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = PROJECT_ROOT / "config" / "emulator.local.yaml"
EXAMPLE_CONFIG = PROJECT_ROOT / "config" / "emulator.example.yaml"
INSTALL_HASH_FILE = ".openremote-teltonika-emulator.install-hash"
DEFAULT_PORT = 8090


def venv_python(venv_dir: Path) -> Path:
    if os.name == "nt":
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def install_hash(project_root: Path = PROJECT_ROOT) -> str:
    return hash_file(project_root / "pyproject.toml")


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex((host, port)) != 0


def choose_port(host: str, requested_port: int | None, fallback_span: int = 20) -> int:
    if requested_port is not None:
        if is_port_available(host, requested_port):
            return requested_port
        raise RuntimeError(f"Port {requested_port} is already in use on {host}.")

    for port in range(DEFAULT_PORT, DEFAULT_PORT + fallback_span + 1):
        if is_port_available(host, port):
            return port
    raise RuntimeError(f"No available port found between {DEFAULT_PORT} and {DEFAULT_PORT + fallback_span}.")


def ensure_config(config_path: Path, example_path: Path = EXAMPLE_CONFIG) -> bool:
    if config_path.exists():
        return False
    config_path.parent.mkdir(parents=True, exist_ok=True)
    return False


def ensure_venv(venv_dir: Path) -> Path:
    python_path = venv_python(venv_dir)
    if not python_path.exists():
        print(f"[setup] Creating virtual environment: {venv_dir}")
        venv.EnvBuilder(with_pip=True).create(venv_dir)
    return python_path


def ensure_dependencies(python_path: Path, project_root: Path, reinstall: bool = False, skip_install: bool = False) -> None:
    if skip_install:
        print("[setup] Skipping dependency install")
        return

    current_hash = install_hash(project_root)
    hash_path = python_path.parent.parent / INSTALL_HASH_FILE
    installed_hash = hash_path.read_text(encoding="utf-8").strip() if hash_path.exists() else ""
    if not reinstall and installed_hash == current_hash:
        print("[setup] Dependencies already installed")
        return

    print("[setup] Installing emulator dependencies")
    subprocess.run([str(python_path), "-m", "pip", "install", "-e", ".[dev]"], cwd=project_root, check=True)
    hash_path.write_text(current_hash, encoding="utf-8")


def open_when_ready(url: str, timeout_seconds: int = 30) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1):
                webbrowser.open(url)
                return
        except OSError:
            time.sleep(0.35)


def build_server_command(python_path: Path, args: argparse.Namespace, port: int, config_path: Path) -> list[str]:
    command = [
        str(python_path),
        "-m",
        "teltonika_emulator",
        "--host",
        args.host,
        "--port",
        str(port),
        "--config",
        str(config_path),
    ]
    if args.no_autostart:
        command.append("--no-autostart")
    return command


def browser_host(bind_host: str) -> str:
    if bind_host in {"0.0.0.0", "::"}:
        return "127.0.0.1"
    return bind_host


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap and run the OpenRemote Teltonika FMC003 emulator")
    parser.add_argument("--host", default="127.0.0.1", help="Web UI bind host")
    parser.add_argument("--port", type=int, help=f"Web UI bind port. Defaults to first free port from {DEFAULT_PORT}.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="Path to emulator YAML config")
    parser.add_argument("--no-autostart", action="store_true", help="Do not start enabled trackers on launch")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser automatically")
    parser.add_argument("--reinstall", action="store_true", help="Force reinstall of Python dependencies")
    parser.add_argument("--skip-install", action="store_true", help="Skip dependency installation")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if sys.version_info < (3, 11):
        print("[error] Python 3.11 or newer is required.", file=sys.stderr)
        return 1

    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = PROJECT_ROOT / config_path

    try:
        created_config = ensure_config(config_path)
        python_path = ensure_venv(PROJECT_ROOT / ".venv")
        ensure_dependencies(python_path, PROJECT_ROOT, reinstall=args.reinstall, skip_install=args.skip_install)
        port = choose_port(args.host, args.port)
    except Exception as exc:  # noqa: BLE001 - bootstrapper should surface plain setup errors.
        print(f"[error] {exc}", file=sys.stderr)
        return 1

    url = f"http://{browser_host(args.host)}:{port}/"
    if created_config:
        print(f"[setup] Created local config: {config_path}")
    print(f"[run] Starting Teltonika emulator: {url}")
    print("[run] Press Ctrl+C to stop")

    if not args.no_open:
        threading.Thread(target=open_when_ready, args=(url,), daemon=True).start()

    command = build_server_command(python_path, args, port, config_path)
    try:
        return subprocess.run(command, cwd=PROJECT_ROOT).returncode
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
