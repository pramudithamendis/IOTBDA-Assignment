# mqtt_subscriber.py
import json
import paho.mqtt.client as mqtt
from app.database import sensor_collection, ml_collection, anomalies_collection
from datetime import datetime, timedelta
import os
import asyncio
import ssl
from queue import Queue
from app.routers.sensors import broadcast  
import joblib

model = joblib.load("app/ml/anomaly_model.pkl")
scaler = joblib.load("app/ml/scaler.pkl")

fastapi_loop = None
mqtt_client = None
data_queue = Queue()  # Thread-safe queue for messages

# Alert cooldown: suppress repeated alerts within this window (seconds)
ALERT_COOLDOWN_SECONDS = 30
last_alert_time = {}  # keyed by user_id

MQTT_BROKER = os.getenv("MQTT_URL")
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASS = os.getenv("MQTT_PASS")
TOPIC_SENSOR = "sleepsense/user_001/sensors"
TOPIC_ML = "sleepsense/user_001/ml"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT connected")
        result_sensor = client.subscribe(TOPIC_SENSOR, qos=1)
        result_ml = client.subscribe(TOPIC_ML, qos=1)
        print(f"📡 Subscribed to '{TOPIC_SENSOR}' with QoS=1. Subscribe result: {result_sensor}")
        print(f"📡 Subscribed to '{TOPIC_ML}' with QoS=1. Subscribe result: {result_ml}")
    else:
        print(f"❌ MQTT failed to connect, rc = {rc}")
        error_messages = {
            1: "Connection refused - incorrect protocol version",
            2: "Connection refused - invalid client identifier",
            3: "Connection refused - server unavailable",
            4: "Connection refused - bad username or password",
            5: "Connection refused - not authorised",
        }
        print(f"   Error: {error_messages.get(rc, 'Unknown error')}")

def on_message(client, userdata, msg):
    try:
        print(f"📨 Message received on topic: {msg.topic}")
        data = json.loads(msg.payload.decode())
        print(f"📦 Parsed payload: {data}")
        
        data["timestamp"] = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
        
        # Put data in thread-safe queue for processing
        # classify message type (default = sensor)
        if msg.topic == TOPIC_ML:
            msg_type = "ml"
        else:
            msg_type = "sensor"
        # keep original behavior (no structural change)
        data["msg_type"] = msg_type
        data_queue.put(data)

        print("📤 Data queued + broadcast triggered")


    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
    except ValueError as e:
        print(f"❌ Timestamp parsing error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error in on_message: {e}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"❌ Unexpected disconnection. Return code: {rc}")
    else:
        print("📴 MQTT disconnected gracefully")

async def process_data_queue():
    """Background task to process queued messages"""
    while True:
        try:
            # Non-blocking check if data available
            if not data_queue.empty():
                data = data_queue.get(block=False)
                try:
                    msg_type = data.pop("msg_type", "sensor")

                    if msg_type == "ml":
                        await ml_collection.insert_one(data)
                        continue

                    result = await sensor_collection.insert_one(data)

                    sensor_payload = {
                        "type": "SENSOR_DATA",
                        "data": {
                            "temperature": data.get("temperature"),
                            "humidity": data.get("humidity"),
                            "sound_level": data.get("sound_level"),
                            "light_intensity": data.get("light_intensity"),
                            "motion_detected": data.get("motion_detected"),
                            "distance": data.get("distance"),
                        },
                        "timestamp": data["timestamp"].isoformat(),
                    }

                    await broadcast(sensor_payload)

                    if msg_type == "sensor":
                        # run ML inference (or load model)
                        X = [[
                            data["temperature"],
                            data["humidity"],
                            data["sound_level"],
                            data["light_intensity"],
                            data["motion_detected"],
                            data["distance"]
                        ]]

                        X_scaled = scaler.transform(X)
                        prediction = model.predict(X_scaled)

                        if prediction[0] == -1:
                            user_id = data.get("user_id", "unknown")
                            now = datetime.utcnow()

                            # Check cooldown — skip if last alert was too recent
                            if user_id in last_alert_time and (now - last_alert_time[user_id]).total_seconds() < ALERT_COOLDOWN_SECONDS:
                                print(f"⏳ Alert cooldown active for {user_id}, skipping broadcast")
                            else:
                                last_alert_time[user_id] = now

                                reason = []
                                if data["motion_detected"] > 1:
                                    reason.append("high_motion")

                                if data["temperature"] > 30:
                                    reason.append("high_temperature")

                                if data["sound_level"] > 180:
                                    reason.append("high_noise")

                                if data["light_intensity"] > 10:
                                    reason.append("light_exposure")

                                if not reason:
                                    reason.append("unknown_pattern")

                                alert = {
                                    "type": "ANOMALY_ALERT",
                                    "message": "Sleep disturbance detected",
                                    "user_id": user_id,
                                    "session_id": data["session_id"],
                                    "data": {
                                        "temperature": data.get("temperature"),
                                        "humidity": data.get("humidity"),
                                        "sound_level": data.get("sound_level"),
                                        "light_intensity": data.get("light_intensity"),
                                        "motion_detected": data.get("motion_detected"),
                                        "distance": data.get("distance")
                                    },
                                    "timestamp": data["timestamp"].isoformat(),
                                    "reason": reason
                                }

                                await anomalies_collection.insert_one({
                                    **alert,
                                    "timestamp": data["timestamp"]  # store datetime in DB
                                })

                                # Already on the event loop, await directly
                                await broadcast(alert)

                    
                    print(f"✅ Data inserted successfully. ID: {result.inserted_id}")
                except Exception as e:
                    print(f"❌ Database insert failed: {e}")
            else:
                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
        except Exception as e:
            print(f"❌ Error in process_data_queue: {e}")
            await asyncio.sleep(1)

async def start_mqtt(loop):
    global fastapi_loop, mqtt_client
    
    print(f"\n🚀 Starting MQTT subscriber...")
    print(f"   MQTT Broker: {MQTT_BROKER}")
    print(f"   MQTT User: {MQTT_USER}")
    print(f"   MQTT Pass: {'*' * (len(MQTT_PASS) - 2) + MQTT_PASS[-2:] if MQTT_PASS and len(MQTT_PASS) > 2 else '(empty or too short!)'}")
    print(f"   Sensor Topic: {TOPIC_SENSOR}")
    print(f"   ML Topic: {TOPIC_ML}")
    
    # Validate environment variables
    if not all([MQTT_BROKER, MQTT_USER, MQTT_PASS]):
        print("❌ Missing MQTT configuration. Check MQTT_URL, MQTT_USER, MQTT_PASS in .env")
        return
    
    fastapi_loop = loop
    print(f"✅ Event loop set")
    
    mqtt_client = mqtt.Client()
    mqtt_client.username_pw_set(MQTT_USER, MQTT_PASS)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.on_disconnect = on_disconnect
    
    # Enable TLS/SSL for secure connection on port 8883
    mqtt_client.tls_set_context(ssl.create_default_context())
    mqtt_client.tls_insecure = True  # Accept self-signed certificates

    try:
        print(f"🔗 Attempting to connect to {MQTT_BROKER}:8883 with TLS...")
        mqtt_client.connect(MQTT_BROKER, 8883, keepalive=60)
        mqtt_client.loop_start()
        print("✅ MQTT loop started")
        
        # Start background task to process queued data
        asyncio.create_task(process_data_queue())
        print("✅ Data processor task started")
    except Exception as e:
        print(f"❌ Failed to connect to MQTT broker: {e}")

async def stop_mqtt():
    global mqtt_client
    if mqtt_client:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("MQTT subscriber stopped")