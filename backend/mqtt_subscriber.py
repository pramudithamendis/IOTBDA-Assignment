# mqtt_subscriber.py
import json
import paho.mqtt.client as mqtt
from database import db
from datetime import datetime
import os
import asyncio
import ssl
from queue import Queue

fastapi_loop = None
mqtt_client = None
data_queue = Queue()  # Thread-safe queue for messages

MQTT_BROKER = os.getenv("MQTT_URL")
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASS = os.getenv("MQTT_PASS")
TOPIC = "sleepsense/user_001/sensors"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT connected")
        result = client.subscribe(TOPIC, qos=1)
        print(f"📡 Subscribed to '{TOPIC}' with QoS=1. Subscribe result: {result}")
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
        data_queue.put(data)
        print(f"📤 Data queued for database insertion")

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
                    result = await db.sensor_data.insert_one(data)
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
    print(f"   Topic: {TOPIC}")
    
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