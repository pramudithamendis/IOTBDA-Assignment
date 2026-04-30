import pandas as pd


# =========================
# Map cluster → readiness score
# =========================
def map_cluster_to_readiness(cluster: str) -> int:
    if cluster == "Good Sleep":
        return 90
    elif cluster == "Light Sleep":
        return 70
    elif cluster == "Disturbed Sleep":
        return 50
    return 60


# =========================
# Generate Insights & Readiness
# =========================
def generate_insights_from_df(df: pd.DataFrame):
    insights = []
    readiness = 60  # default fallback

    # =========================
    # Safety check
    # =========================
    if df is None or df.empty:
        return {
            "insights": [{
                "title": "No Data Available",
                "description": "Sleep data is not available yet.",
                "type": "warning"
            }],
            "readiness": readiness
        }

    df.columns = df.columns.str.strip()

    # =========================
    # 1. CORE ML INSIGHT (Pattern)
    # =========================
    dominant_cluster = None

    if "cluster_name" in df.columns:
        dominant_cluster = df["cluster_name"].value_counts().idxmax()

        # derive readiness from ML output
        readiness = map_cluster_to_readiness(dominant_cluster)

        if dominant_cluster == "Good Sleep":
            insights.append({
                "title": "Stable Sleep Pattern",
                "description": "Your sessions consistently show strong and balanced sleep behaviour.",
                "type": "positive"
            })

        elif dominant_cluster == "Light Sleep":
            insights.append({
                "title": "Light Sleep Trend",
                "description": "Your sleep shows mild instability across multiple sessions.",
                "type": "warning"
            })

        elif dominant_cluster == "Disturbed Sleep":
            insights.append({
                "title": "Disturbed Sleep Pattern",
                "description": "Frequent disruptions are observed in your sleep behaviour.",
                "type": "warning"
            })

    # =========================
    # 2. CONTRIBUTING FACTORS (NO OVERLAP)
    # =========================

    # 🔊 Noise → Stability factor
    if "sound_std" in df.columns:
        avg_noise = df["sound_std"].mean()

        if avg_noise < 0.1:
            insights.append({
                "title": "Low Noise Environment",
                "description": "Stable sound levels support uninterrupted sleep cycles.",
                "type": "positive"
            })
        else:
            insights.append({
                "title": "Noise Variability Detected",
                "description": "Fluctuating sound levels may be affecting sleep continuity.",
                "type": "warning"
            })

    # Light → Circadian factor
    if "light_avg" in df.columns:
        avg_light = df["light_avg"].mean()

        if avg_light < 0.1:
            insights.append({
                "title": "Dark Sleep Environment",
                "description": "Lower light exposure supports deeper sleep phases.",
                "type": "positive"
            })
        else:
            insights.append({
                "title": "Light Exposure Detected",
                "description": "Higher light levels may interfere with sleep depth.",
                "type": "warning"
            })

    # Motion → Restlessness factor (only if relevant)
    if "motion_rate" in df.columns:
        avg_motion = df["motion_rate"].mean()

        if avg_motion > 0.15:
            insights.append({
                "title": "Elevated Movement During Sleep",
                "description": "Frequent movement suggests possible restlessness.",
                "type": "warning"
            })

    # =========================
    # 3. PRIORITY & LIMIT
    # =========================

    priority = {"warning": 0, "positive": 1, "neutral": 2}

    insights = sorted(insights, key=lambda x: priority[x["type"]])

    return {
        "insights": insights[:5],
        "readiness": readiness
    }