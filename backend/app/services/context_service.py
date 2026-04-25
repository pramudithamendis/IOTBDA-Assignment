from app.database import sensor_collection, ml_collection, anomalies_collection
from app.services.analytics_service import (
    analyze_sleep_trend,
    summarize_anomalies,
    aggregate_sensors
)

# get the sleep scores from the database
async def get_sleep_scores(user_id, limit=50):
    cursor = ml_collection.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit)

    return await cursor.to_list(length=limit)


# get the sensors data from the database
async def get_sensors(user_id, limit=200):
    cursor = sensor_collection.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit)

    return await cursor.to_list(length=limit)


# get the anomalies data from the database
async def get_anomalies(user_id, limit=20):
    cursor = anomalies_collection.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit)

    return await cursor.to_list(length=limit)


# MAIN context builder
async def build_context(user_id):

    scores = await get_sleep_scores(user_id)
    sensors = await get_sensors(user_id)
    anomalies = await get_anomalies(user_id)

    trend = analyze_sleep_trend(scores)
    anomaly_summary = summarize_anomalies(anomalies)
    sensor_summary = aggregate_sensors(sensors)

    return {
        **trend,
        "anomaly_count": anomaly_summary["count"],
        "recent_anomalies": anomaly_summary["types"],
        **sensor_summary
    }