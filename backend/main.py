# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ADD
from mqtt_subscriber import start_mqtt, stop_mqtt
from dotenv import load_dotenv
from database import db
import asyncio
from datetime import datetime
from routers.sensors import router as sensors_router
from bson import ObjectId

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
    
@app.get("/api/sensors/latest")
async def get_latest(limit: int = 10):
    try:
        data = await db.sensor_data.find().sort("timestamp", -1).to_list(limit)
        
        # Convert MongoDB objects to JSON-serializable format
        result = []
        for item in data:
            # Convert ObjectId to string
            item['_id'] = str(item['_id'])
            
            # Convert datetime to ISO string
            if isinstance(item.get('timestamp'), datetime):
                item['timestamp'] = item['timestamp'].isoformat()
            
            result.append(item)
        
        return result
    except Exception as e:
        print(f"Error in /api/sensors/latest: {e}")
        return []