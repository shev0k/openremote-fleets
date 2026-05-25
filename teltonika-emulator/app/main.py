from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.models import EmulatorConfig, TrackerConfig
from app.service import EmulatorService

PACKAGE_ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG_PATH = PACKAGE_ROOT.parent / "config" / "emulator.local.yaml"


def create_app(config_path: Path | str = DEFAULT_CONFIG_PATH, autostart: bool = True) -> FastAPI:
    service = EmulatorService.from_path(Path(config_path))
    templates = Jinja2Templates(directory=str(PACKAGE_ROOT / "templates"))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if autostart:
            await service.start_enabled()
        try:
            yield
        finally:
            await service.stop_all()

    app = FastAPI(title="OpenRemote Teltonika FMC003 Emulator", lifespan=lifespan)
    app.state.service = service
    app.mount("/static", StaticFiles(directory=str(PACKAGE_ROOT / "static")), name="static")

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> Response:
        return templates.TemplateResponse(request, "index.html")

    @app.get("/api/config")
    async def get_config() -> dict:
        return service.get_config().model_dump(mode="json")

    @app.put("/api/config")
    async def put_config(config: EmulatorConfig) -> dict:
        await service.stop_all()
        return service.replace_config(config).model_dump(mode="json")

    @app.post("/api/trackers", status_code=status.HTTP_201_CREATED)
    async def add_tracker(tracker: TrackerConfig) -> dict:
        try:
            return service.add_tracker(tracker).model_dump(mode="json")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.post("/api/trackers/deploy-presets", status_code=status.HTTP_201_CREATED)
    async def deploy_preset_trackers() -> dict:
        trackers = service.deploy_preset_trackers()
        return {
            "created_count": len(trackers),
            "created": [tracker.model_dump(mode="json") for tracker in trackers],
        }

    @app.patch("/api/trackers/{imei}")
    async def update_tracker(imei: str, tracker: TrackerConfig) -> dict:
        try:
            return (await service.update_tracker(imei, tracker)).model_dump(mode="json")
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tracker not found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    @app.delete("/api/trackers/{imei}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_tracker(imei: str) -> Response:
        try:
            await service.delete_tracker(imei)
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tracker not found") from exc
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/api/trackers/{imei}/start")
    async def start_tracker(imei: str) -> dict:
        try:
            await service.start_tracker(imei)
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tracker not found") from exc
        return {"status": "started"}

    @app.post("/api/trackers/{imei}/stop")
    async def stop_tracker(imei: str) -> dict:
        try:
            await service.stop_tracker(imei)
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tracker not found") from exc
        return {"status": "stopped"}

    @app.post("/api/control/start-all")
    async def start_all() -> dict:
        await service.start_all()
        return {"status": "started"}

    @app.post("/api/control/stop-all")
    async def stop_all() -> dict:
        await service.stop_all()
        return {"status": "stopped"}

    @app.get("/api/status")
    async def get_status() -> dict:
        return {"trackers": [status_item.model_dump(mode="json") for status_item in service.statuses()]}

    @app.get("/api/events")
    async def events() -> StreamingResponse:
        return StreamingResponse(service.event_stream(), media_type="text/event-stream")

    return app
