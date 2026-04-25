def analyze_sleep_trend(scores):
    if not scores:
        return {}

    values = [s["sleep_score"] for s in scores][::-1]

    start = values[0]
    end = values[-1]
    drop = start - end
    avg = sum(values) / len(values)
    lowest = min(values)

    trend = "declining" if drop > 10 else "stable"

    return {
        "start_score": start,
        "end_score": end,
        "drop": drop,
        "avg_score": round(avg, 2),
        "lowest_score": lowest,
        "trend": trend
    }


def summarize_anomalies(anomalies):
    reasons = [a.get("reason", "unknown") for a in anomalies]

    return {
        "count": len(anomalies),
        "types": list(set(reasons))[:5]
    }


def aggregate_sensors(sensors):
    if not sensors:
        return {}

    temps = [s["features"]["temp"] for s in sensors if "features" in s]
    motions = [s["features"]["motion"] for s in sensors if "features" in s]

    return {
        "avg_temp": round(sum(temps) / len(temps), 2) if temps else None,
        "avg_motion": round(sum(motions) / len(motions), 2) if motions else None
    }