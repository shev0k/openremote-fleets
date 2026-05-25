from __future__ import annotations

import asyncio
import json
import ssl

from paho.mqtt import client as mqtt

from app.models import MqttConnectionConfig, TrackerState
from app.teltonika.mqtt_payload import build_mqtt_payload


async def publish_mqtt_update(config: MqttConnectionConfig, state: TrackerState) -> None:
    topic, payload = build_mqtt_payload(config.realm, config.client_id, state)
    await asyncio.to_thread(_publish_sync, config, topic, payload)


def _publish_sync(config: MqttConnectionConfig, topic: str, payload: dict) -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"{config.client_id}-{topic.split('/')[-2]}")
    if config.username:
        client.username_pw_set(config.username, config.password)
    if config.tls:
        client.tls_set(cert_reqs=ssl.CERT_NONE)
        client.tls_insecure_set(True)
    client.connect(config.host, config.port, keepalive=30)
    client.loop_start()
    result = client.publish(topic, json.dumps(payload), qos=0)
    result.wait_for_publish(timeout=10)
    client.loop_stop()
    client.disconnect()
    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        raise ConnectionError(f"MQTT publish failed with code {result.rc}")

