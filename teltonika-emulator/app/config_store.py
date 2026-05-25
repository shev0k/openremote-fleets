from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.defaults import create_default_config
from app.models import EmulatorConfig


class ConfigStore:
    def __init__(self, path: Path):
        self.path = path

    def load(self) -> EmulatorConfig:
        if not self.path.exists():
            return create_default_config()
        data = yaml.safe_load(self.path.read_text(encoding="utf-8")) or {}
        return EmulatorConfig.model_validate(data)

    def save(self, config: EmulatorConfig) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        data: dict[str, Any] = config.model_dump(mode="json")
        self.path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

