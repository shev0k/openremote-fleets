from __future__ import annotations

import argparse
from pathlib import Path

import uvicorn

from app.main import DEFAULT_CONFIG_PATH, create_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the OpenRemote Teltonika FMC003 emulator")
    parser.add_argument("--host", default="127.0.0.1", help="Web UI bind host")
    parser.add_argument("--port", default=8090, type=int, help="Web UI bind port")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="Path to emulator YAML config")
    parser.add_argument("--no-autostart", action="store_true", help="Do not start enabled trackers on launch")
    args = parser.parse_args()
    app = create_app(config_path=Path(args.config), autostart=not args.no_autostart)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()

