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
    reasons = []

    for a in anomalies:
        r = a.get("reason", [])

        if isinstance(r, list):
            reasons.extend(r)
        else:
            reasons.append(r)

    return {
        "count": len(anomalies),
        "types": list(set(reasons))[:5]
    }


def aggregate_sensors(sensors):
    if not sensors:
        return {}

    temps = [s.get("temperature") for s in sensors if s.get("temperature") is not None]
    motions = [s.get("motion_detected") for s in sensors if s.get("motion_detected") is not None]

    return {
        "avg_temp": round(sum(temps) / len(temps), 2) if temps else None,
        "avg_motion": round(sum(motions) / len(motions), 2) if motions else None
    }