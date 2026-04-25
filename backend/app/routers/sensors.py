# routes/sensors.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
import asyncio
from database import db

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


@router.get("/api/historical-analysis")
async def get_historical_analysis(
    user_id: str = Query(default="user_001"),
    timeframe: str = Query(default="7d", pattern="^(7d|30d|overnight)$"),
):
    latest_timestamp_result = await db.sensor_data.aggregate(
        [
            {"$match": {"user_id": user_id}},
            {"$addFields": {"normalized_timestamp": {"$toDate": "$timestamp"}}},
            {"$group": {"_id": None, "latest": {"$max": "$normalized_timestamp"}}},
        ]
    ).to_list(length=1)

    if not latest_timestamp_result:
        return {"user_id": user_id, "timeframe": timeframe, "points": []}

    anchor_time = latest_timestamp_result[0]["latest"]
    if anchor_time.tzinfo is None:
        anchor_time = anchor_time.replace(tzinfo=timezone.utc)

    if timeframe == "7d":
        start_time = anchor_time - timedelta(days=7)
        bucket_format = "%Y-%m-%d"
    elif timeframe == "30d":
        start_time = anchor_time - timedelta(days=30)
        bucket_format = "%Y-%m-%d"
    else:
        # Overnight: use the latest 12 hours for near-term sleep analysis.
        start_time = anchor_time - timedelta(hours=12)
        bucket_format = "%Y-%m-%d %H:00"

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$addFields": {"normalized_timestamp": {"$toDate": "$timestamp"}}},
        {"$match": {"normalized_timestamp": {"$gte": start_time, "$lte": anchor_time}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": bucket_format,
                        "date": "$normalized_timestamp",
                        "timezone": "UTC",
                    }
                },
                "light_intensity": {"$avg": "$light_intensity"},
                "sound_level": {"$avg": "$sound_level"},
                "temperature": {"$avg": "$temperature"},
                "humidity": {"$avg": "$humidity"},
                "distance": {"$avg": "$distance"},
                "motion_count": {
                    "$sum": {
                        "$cond": [
                            {"$in": ["$motion_detected", [1, True]]},
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"_id": 1}},
    ]

    session_user_hint = user_id.replace("_", "")
    ml_pipeline = [
        {
            "$match": {
                "$or": [
                    {"user_id": user_id},
                    {"session_id": {"$regex": session_user_hint, "$options": "i"}},
                ]
            }
        },
        {"$addFields": {"normalized_timestamp": {"$toDate": "$timestamp"}}},
        {"$match": {"normalized_timestamp": {"$gte": start_time, "$lte": anchor_time}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": bucket_format,
                        "date": "$normalized_timestamp",
                        "timezone": "UTC",
                    }
                },
                "sleep_score": {"$avg": "$sleep_score"},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    cursor = db.sensor_data.aggregate(pipeline)
    records = await cursor.to_list(length=500)
    ml_cursor = db.ml_data.aggregate(ml_pipeline)
    ml_records = await ml_cursor.to_list(length=500)
    sleep_score_by_label = {
        row["_id"]: round(float(row.get("sleep_score", 0.0)), 2)
        for row in ml_records
    }

    chart_data = []
    for row in records:
        chart_data.append(
            {
                "label": row["_id"],
                "light": round(float(row.get("light_intensity", 0.0)), 2),
                "noise": round(float(row.get("sound_level", 0.0)), 2),
                "temperature": round(float(row.get("temperature", 0.0)), 2),
                "humidity": round(float(row.get("humidity", 0.0)), 2),
                "movement": round(float(row.get("distance", 0.0)), 2),
                "sleep_quality": sleep_score_by_label.get(row["_id"]),
                "motion_events": int(row.get("motion_count", 0)),
            }
        )

    return {
        "user_id": user_id,
        "timeframe": timeframe,
        "points": chart_data,
    }