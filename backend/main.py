# main.py
from fastapi import FastAPI
from mqtt_subscriber import start_mqtt, stop_mqtt
from dotenv import load_dotenv
from database import db
import asyncio
from datetime import datetime
from routers.sensors import router as sensors_router

load_dotenv()

app = FastAPI()

# Include the router
app.include_router(sensors_router, prefix="/sensors")

# Start MQTT in FastAPI startup event
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
    """Test database connection"""
    try:
        # Try to insert a test document
        test_data = {
            "test": True,
            "timestamp": datetime.now()
        }
        result = await db.sensors.insert_one(test_data)
        return {
            "status": "success",
            "message": "Database connection working",
            "inserted_id": str(result.inserted_id)
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
