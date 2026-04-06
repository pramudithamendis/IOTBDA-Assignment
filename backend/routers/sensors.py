# routes/sensors.py
from fastapi import APIRouter, WebSocket
from mqtt_subscriber import data_queue
import asyncio

router = APIRouter()
@router.websocket("/ws/sensors")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if not data_queue.empty():
                data = data_queue.get(block=False)
                await websocket.send_json(data)
            else:
                await asyncio.sleep(0.1)  # Sleep briefly to avoid busy waiting
    except Exception as e:
        print(f"WebSocket error: {e}")