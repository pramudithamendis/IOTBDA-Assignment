from pydantic import BaseModel

class SensorData(BaseModel):
    timestamp: str
    session_id: str
    user_id: str
    sound_level: int
    distance: float
    motion_detected: bool
    light_intensity: float
    temperature: float
    humidity: float