# routes/sensors.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter(prefix="/ws")

connected_clients = set()

@router.websocket("/sensors")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"✅ Client connected. Total: {len(connected_clients)}")
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("📴 Client disconnected")
    finally:
        connected_clients.discard(websocket)  


async def broadcast(data):
    print(f"📡 Broadcasting to {len(connected_clients)} clients: {data}")
    dead = []
    for client in connected_clients:
        try:
            await client.send_json(data)
        except Exception as e:
            print(f"❌ WebSocket send failed: {e}")  
            dead.append(client)
    for d in dead:
        connected_clients.remove(d)