# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ADD
from app.mqtt_subscriber import start_mqtt, stop_mqtt
from dotenv import load_dotenv
from app.database import db
import asyncio
from datetime import datetime
from app.routers.sensors import router as sensors_router
from app.routers.chat import router as chat_router

load_dotenv()

app = FastAPI()

# ADD CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIX: remove prefix so WebSocket is at /ws/sensors not /sensors/ws/sensors
app.include_router(sensors_router)
app.include_router(chat_router)

@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_running_loop()
    await start_mqtt(loop)

@app.on_event("shutdown")
async def shutdown_event():
    await stop_mqtt()

@app.get("/")
def root():
    return {"message": "Backend running"}

@app.get("/test/db")
async def test_db():
    try:
        test_data = {"test": True, "timestamp": datetime.now()}
        result = await db.sensors.insert_one(test_data)
        return {"status": "success", "inserted_id": str(result.inserted_id)}
    except Exception as e:
        return {"status": "error", "message": str(e)}