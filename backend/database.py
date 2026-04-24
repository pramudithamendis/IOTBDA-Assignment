import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.SphereSleep

# Collections 
sensor_collection = db["sensor_data"]
ml_collection = db["ml_data"] 